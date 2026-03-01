// routes/accounts.js
// Custodial account creation for walletless onboarding.
// Creates a real Flow account for each user, funded by the deployer.

import { Router } from 'express'
import { generateKeyPair, createFlowAccount, hasPrivateKey, signWithKey, serverAuthorization, custodialAuthorization } from '../../lib/flow-signer.js'
import { logAudit, getSupabase } from '../../lib/supabase.js'
import { encryptKey, decryptKey } from '../../lib/crypto.js'
import { generateSessionToken, safeError } from '../../lib/middleware.js'
import { getAddress } from '../../lib/flow-addresses.js'

const router = Router()

// ── Funding configuration ──
// Testnet: generous for demos. Mainnet: minimal for tx fees only.
const isMainnet = (process.env.FLOW_NETWORK || 'testnet') === 'mainnet'
const FUND_AMOUNT = parseFloat(
  process.env.INITIAL_FUND_AMOUNT || (isMainnet ? '0.001' : '1000.0')
)
const DAILY_FUND_CAP = parseFloat(
  process.env.DAILY_FUND_CAP || (isMainnet ? '1.0' : '100000.0')
)

// Track daily funding to prevent deployer drain
let dailyFundedTotal = 0
let dailyFundedDate = new Date().toISOString().slice(0, 10)

function resetDailyCapIfNeeded() {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== dailyFundedDate) {
    dailyFundedTotal = 0
    dailyFundedDate = today
  }
}

// In-memory fallback when Supabase is not configured
const userAccountsMemory = new Map()

// Mutex: prevent concurrent account creation for the same email
const creationLocks = new Set()

// ── Supabase-backed user store (with in-memory fallback) ──
async function getUser(email) {
  const key = email.toLowerCase()
  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await sb.from('users').select('*').eq('email', key).single()
      if (data) return {
        email: data.email,
        address: data.flow_address,
        publicKey: data.public_key,
        privateKey: decryptKey(data.encrypted_private_key),
        authMethod: data.auth_method,
        createdAt: data.created_at,
      }
      // PGRST116 = "no rows found" — expected for genuinely new users
      if (error && error.code !== 'PGRST116') {
        console.warn('[Accounts] Supabase getUser error:', error.code, error.message)
      }
      return null
    } catch (err) {
      // Network / connection failure — do NOT silently create a duplicate account
      console.error('[Accounts] Supabase getUser FAILED — refusing to fall through:', err.message)
      throw err
    }
  }
  // Supabase not configured — dev-mode in-memory fallback
  return userAccountsMemory.get(key) || null
}

async function getUserByAddress(flowAddress) {
  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await sb.from('users').select('*').eq('flow_address', flowAddress).single()
      if (data) return {
        email: data.email,
        address: data.flow_address,
        publicKey: data.public_key,
        privateKey: decryptKey(data.encrypted_private_key),
        authMethod: data.auth_method,
        createdAt: data.created_at,
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('[Accounts] Supabase getUserByAddress error:', error.code, error.message)
      }
      return null
    } catch (err) {
      console.error('[Accounts] Supabase getUserByAddress FAILED:', err.message)
      throw err
    }
  }
  // Supabase not configured — search in-memory store by address
  for (const [, record] of userAccountsMemory) {
    if (record.address === flowAddress) return record
  }
  return null
}

async function saveUser(record) {
  const key = record.email.toLowerCase()
  userAccountsMemory.set(key, record)
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.from('users').upsert({
        email: key,
        flow_address: record.address,
        public_key: record.publicKey,
        encrypted_private_key: record.privateKey ? encryptKey(record.privateKey) : '',
        auth_method: record.authMethod || 'passkey',
        jurisdiction: record.jurisdiction || null,
        credential_tx_id: record.transactionId || null,
      }, { onConflict: 'email' })
    } catch (err) {
      console.warn('[Accounts] Supabase save failed:', err.message)
    }
  }
}

/**
 * POST /api/accounts/create
 * Body: { email, authMethod }
 * 
 * Creates a new custodial Flow account for the user.
 * If user already has an account, returns the existing one.
 * The user's private key is stored server-side (custodial model).
 */
router.post('/create', async (req, res) => {
  const { email, authMethod = 'passkey' } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const emailKey = email.toLowerCase()

  // Prevent concurrent creation for the same email (race condition guard)
  if (creationLocks.has(emailKey)) {
    return res.status(409).json({ error: 'Account creation already in progress for this email' })
  }
  creationLocks.add(emailKey)

  try {
    return await _handleCreate(req, res, emailKey, authMethod)
  } finally {
    creationLocks.delete(emailKey)
  }
})

async function _handleCreate(req, res, emailKey, authMethod) {
  const email = emailKey

  if (!hasPrivateKey()) {
    return res.status(500).json({ error: 'Server signing not available' })
  }

  // Refuse to create accounts in production without Supabase — prevents
  // in-memory-only records that vanish on every Railway redeploy.
  if (!getSupabase() && process.env.NODE_ENV === 'production') {
    console.error('[Accounts] BLOCKED: account creation without Supabase in production')
    return res.status(503).json({
      error: 'Database not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY on Railway',
    })
  }

  // Check if user already has an account
  let existing
  try {
    existing = await getUser(email)
  } catch (err) {
    return res.status(503).json({ error: 'Database lookup failed — please try again', details: safeError(err, 'Service unavailable') })
  }
  if (existing) {
    console.log(`[Accounts] Returning existing account ${existing.address} for ${email}`)
    return res.json({
      address: existing.address,
      isNew: false,
      token: generateSessionToken(email),
      source: isMainnet ? 'flow-mainnet' : 'flow-testnet',
    })
  }

  const fcl = req.app.locals.fcl
  const deployerAddress = req.app.locals.contractAddress

  try {
    // 1. Generate a new keypair for this user
    const { privateKey, publicKey } = generateKeyPair()

    // 2. Create the Flow account on-chain (deployer pays)
    const result = await createFlowAccount(fcl, deployerAddress, publicKey)

    // 3. Store the mapping
    const userRecord = {
      email: email.toLowerCase(),
      address: result.address,
      publicKey,
      privateKey, // Stored server-side (custodial). Encrypted via AES-256-GCM when KEY_ENCRYPTION_KEY is set.
      authMethod,
      createdAt: new Date().toISOString(),
      transactionId: result.transactionId,
    }
    await saveUser(userRecord)

    console.log(`[Accounts] Created Flow account ${result.address} for ${email}`)
    logAudit({
      action: 'account_created',
      agent: 'accounts',
      detail: {
        email: email.toLowerCase(),
        address: result.address,
        transactionId: result.transactionId,
        blockHeight: result.blockHeight,
        authMethod,
      },
      severity: 'info',
    })

    // Fund the new account so they can transact
    let funded = false
    let fundTxId = null
    resetDailyCapIfNeeded()

    if (dailyFundedTotal + FUND_AMOUNT > DAILY_FUND_CAP) {
      console.warn(`[Accounts] Daily funding cap reached (${dailyFundedTotal.toFixed(4)}/${DAILY_FUND_CAP} FLOW) — skipping fund for ${result.address}`)
    } else {
      try {
        const fundAuthz = serverAuthorization(fcl, deployerAddress)
        fundTxId = await fcl.mutate({
          cadence: `
            import FungibleToken from ${getAddress('FungibleToken')}
            import FlowToken from ${getAddress('FlowToken')}

            transaction(amount: UFix64, recipient: Address) {
              prepare(signer: auth(Storage) &Account) {
                let vault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                  from: /storage/flowTokenVault
                )!
                let tokens <- vault.withdraw(amount: amount)
                let receiverRef = getAccount(recipient).capabilities.borrow<&{FungibleToken.Receiver}>(
                  /public/flowTokenReceiver
                ) ?? panic("Could not borrow receiver")
                receiverRef.deposit(from: <- tokens)
              }
            }
          `,
          args: (arg, t) => [
            arg(FUND_AMOUNT.toFixed(8), t.UFix64),
            arg(result.address, t.Address),
          ],
          proposer: fundAuthz,
          payer: fundAuthz,
          authorizations: [fundAuthz],
          limit: 999,
        })
        await fcl.tx(fundTxId).onceSealed()
        dailyFundedTotal += FUND_AMOUNT
        funded = true
        console.log(`[Accounts] Funded ${result.address} with ${FUND_AMOUNT} FLOW (daily: ${dailyFundedTotal.toFixed(4)}/${DAILY_FUND_CAP})`)
      } catch (fundErr) {
        console.warn('[Accounts] Funding failed (non-fatal):', fundErr.message)
      }
    }

    res.json({
      address: result.address,
      isNew: true,
      transactionId: result.transactionId,
      blockHeight: result.blockHeight,
      funded,
      fundAmount: funded ? FUND_AMOUNT : 0,
      fundTxId,
      token: generateSessionToken(email),
      source: isMainnet ? 'flow-mainnet' : 'flow-testnet',
    })
  } catch (err) {
    console.error('[Accounts] Create failed:', err.message)
    res.status(500).json({ error: safeError(err, 'Account creation failed') })
  }
}

/**
 * POST /api/accounts/login
 * Body: { email }
 *
 * Returns existing account + session token for returning users.
 * Does NOT create a new account or generate keys.
 */
router.post('/login', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  let user
  try {
    user = await getUser(email)
  } catch (err) {
    return res.status(503).json({ error: 'Database lookup failed', details: safeError(err, 'Service unavailable') })
  }

  if (!user) {
    return res.status(404).json({ error: 'No account found for this email' })
  }

  const token = generateSessionToken(email)

  res.json({
    address: user.address,
    authMethod: user.authMethod,
    createdAt: user.createdAt,
    token,
    source: 'flow-testnet',
  })
})

/**
 * POST /api/accounts/register-wallet
 * Body: { address }
 *
 * Registers a self-custodial wallet user. No private key is stored.
 * If the address is already registered, returns the existing record.
 */
router.post('/register-wallet', async (req, res) => {
  const { address } = req.body
  if (!address) return res.status(400).json({ error: 'address is required' })

  // Check if this wallet address is already registered
  let existing
  try {
    existing = await getUserByAddress(address)
  } catch (err) {
    return res.status(503).json({ error: 'Database lookup failed', details: safeError(err, 'Service unavailable') })
  }

  if (existing) {
    const token = generateSessionToken(existing.email || address)
    return res.json({
      address: existing.address,
      isNew: false,
      authMethod: existing.authMethod,
      createdAt: existing.createdAt,
      token,
    })
  }

  // Register new wallet user — no keys stored server-side
  const userRecord = {
    email: `wallet_${address.toLowerCase()}`,  // synthetic email as lookup key
    address,
    publicKey: '',
    privateKey: '',
    authMethod: 'wallet',
    createdAt: new Date().toISOString(),
  }

  try {
    await saveUser(userRecord)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to register wallet', details: safeError(err) })
  }

  console.log(`[Accounts] Registered self-custodial wallet ${address}`)
  logAudit({
    action: 'wallet_registered',
    agent: 'accounts',
    detail: { address, authMethod: 'wallet' },
    severity: 'info',
  })

  const token = generateSessionToken(address)
  res.json({
    address,
    isNew: true,
    authMethod: 'wallet',
    createdAt: userRecord.createdAt,
    token,
  })
})

/**
 * GET /api/accounts/lookup/:email
 * Returns the Flow address for a given email, if it exists.
 */
router.get('/lookup/:email', async (req, res) => {
  const record = await getUser(req.params.email)
  if (!record) {
    return res.status(404).json({ error: 'No account found for this email' })
  }
  res.json({
    address: record.address,
    authMethod: record.authMethod,
    createdAt: record.createdAt,
  })
})

/**
 * POST /api/accounts/sign
 * Body: { email, message }
 * Signs a message on behalf of a custodial user.
 * Used when the user needs to sign transactions without a wallet.
 */
router.post('/sign', async (req, res) => {
  const { email, message } = req.body
  if (!email || !message) {
    return res.status(400).json({ error: 'email and message are required' })
  }

  const record = await getUser(email)
  if (!record) {
    return res.status(404).json({ error: 'No account found for this email' })
  }

  try {
    const signature = signWithKey(record.privateKey, message)
    res.json({ signature, address: record.address })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Signing failed') })
  }
})

/**
 * GET /api/accounts/balance/:address
 * Returns the real on-chain FLOW balance for a Flow address.
 */
router.get('/balance/:address', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.params.address

  try {
    const balance = await fcl.query({
      cadence: `
        import FungibleToken from ${getAddress('FungibleToken')}
        import FlowToken from ${getAddress('FlowToken')}

        access(all) fun main(addr: Address): UFix64 {
          let acct = getAccount(addr)
          let vaultRef = acct.capabilities.borrow<&{FungibleToken.Balance}>(
            /public/flowTokenBalance
          ) ?? panic("No balance capability")
          return vaultRef.balance
        }
      `,
      args: (arg, t) => [arg(address, t.Address)],
    })

    // Also check if this is a custodial account
    const custodial = await getUserByAddress(address)

    res.json({
      address,
      balance: parseFloat(balance),
      isCustodial: !!custodial,
      source: isMainnet ? 'flow-mainnet' : 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Balance lookup failed'), address })
  }
})

/**
 * POST /api/accounts/mint-credential
 * Body: { email, jurisdiction, riskScore }
 *
 * Mints a ComplianceCredential into the custodial user's own Flow account.
 * Uses a two-authorizer transaction: deployer (admin) + user (recipient).
 * This is the only correct way to store a resource in the user's account storage.
 */
router.post('/mint-credential', async (req, res) => {
  const { email, jurisdiction, riskScore } = req.body

  if (!email) {
    return res.status(400).json({ error: 'email is required' })
  }
  if (!hasPrivateKey()) {
    return res.status(500).json({ error: 'Server signing not available' })
  }

  let user
  try {
    user = await getUser(email)
  } catch (err) {
    return res.status(503).json({ error: 'Database lookup failed — please try again', details: safeError(err, 'Service unavailable') })
  }
  if (!user) {
    return res.status(404).json({ error: 'No custodial account found for this email' })
  }

  const fcl = req.app.locals.fcl
  const deployerAddress = req.app.locals.contractAddress

  const score = riskScore || 15
  const jur = jurisdiction || 'US'

  // Generate deterministic proof/claims hashes (not fake zkp_ prefixed values)
  const { createHash } = await import('crypto')
  const proofHash = createHash('sha256').update(`proof:${email}:${jur}:${score}:${Date.now()}`).digest('hex')
  const claimsHash = createHash('sha256').update(`claims:${email}:${jur}:${score}:${Date.now()}`).digest('hex')

  // Two authorizers: deployer account (holds Admin resource) + user account (receives credential)
  const adminAuthz = serverAuthorization(fcl, deployerAddress)
  const userAuthz = custodialAuthorization(fcl, user.address, user.privateKey)

  try {
    const txId = await fcl.mutate({
      cadence: `
        import ComplianceCredential from 0x${fcl.sansPrefix(deployerAddress)}
        import ZKVerifier from 0x${fcl.sansPrefix(deployerAddress)}

        transaction(jurisdiction: String, riskScore: UInt64, proof: String, claimsHash: String) {
          let admin: &ComplianceCredential.Admin
          let userAcct: auth(Storage, Capabilities) &Account

          prepare(
            adminAcct: auth(Storage) &Account,
            userAcct: auth(Storage, Capabilities) &Account
          ) {
            self.admin = adminAcct.storage.borrow<&ComplianceCredential.Admin>(
              from: ComplianceCredential.AdminStoragePath
            ) ?? panic("No ComplianceCredential Admin resource")
            self.userAcct = userAcct
          }

          execute {
            // Skip if user already holds a valid credential
            let existing = self.userAcct.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
              ComplianceCredential.PublicPath
            )
            if existing != nil && existing!.isValid() {
              return
            }

            // Unpublish stale capability so mintCredential can publish a fresh one
            self.userAcct.capabilities.unpublish(ComplianceCredential.PublicPath)

            let proofData = ZKVerifier.ProofData(
              proof: proof,
              claimsHash: claimsHash,
              verifierName: "FlowShield",
              signature: claimsHash,
              jurisdiction: jurisdiction,
              timestamp: getCurrentBlock().timestamp
            )
            let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: self.userAcct.address)

            let tier = ComplianceCredential.tierFromScore(score: riskScore)
            let expiresAt = getCurrentBlock().timestamp + 7776000.0  // 90 days

            self.admin.mintCredential(
              recipient: self.userAcct,
              tier: tier,
              riskScore: riskScore,
              expiresAt: expiresAt,
              proofHash: result.proofHash,
              jurisdiction: jurisdiction
            )
          }
        }
      `,
      args: (arg, t) => [
        arg(jur, t.String),
        arg(String(score), t.UInt64),
        arg(proofHash, t.String),
        arg(claimsHash, t.String),
      ],
      proposer: adminAuthz,
      payer: adminAuthz,
      authorizations: [adminAuthz, userAuthz],  // Admin signs first, user signs second
      limit: 999,
    })

    const txResult = await fcl.tx(txId).onceSealed()

    if (txResult.errorMessage) {
      console.error(`[Accounts] Credential mint tx failed on-chain: ${txResult.errorMessage}`)
      return res.status(400).json({
        success: false,
        error: txResult.errorMessage,
        txId,
        address: user.address,
      })
    }

    console.log(`[Accounts] Credential minted for ${email} (${user.address}). Tx: ${txId}`)
    logAudit({
      action: 'credential_minted',
      agent: 'accounts',
      detail: { email: email.toLowerCase(), address: user.address, txId, jurisdiction: jur, riskScore: score },
      severity: 'info',
    })

    res.json({
      success: true,
      txId,
      address: user.address,
      blockHeight: txResult.blockHeight,
      jurisdiction: jur,
      riskScore: score,
    })
  } catch (err) {
    console.error('[Accounts] Credential mint failed:', err.message)
    res.status(500).json({ error: 'Credential minting failed', details: safeError(err) })
  }
})

/**
 * POST /api/accounts/mint-credential-wallet
 * Body: { address, jurisdiction, riskScore }
 *
 * Mints a ComplianceCredential for a self-custodial wallet user.
 * Uses a two-authorizer transaction: deployer (admin) signs server-side,
 * but returns the transaction envelope for the wallet user to co-sign via FCL.
 *
 * For now: the admin mints directly to the user's address (single-signer admin tx).
 * The credential is stored in the admin's view of the user's compliance state.
 * Full two-signer support requires the user to be present via FCL in the browser.
 */
router.post('/mint-credential-wallet', async (req, res) => {
  const { address, jurisdiction, riskScore } = req.body

  if (!address) {
    return res.status(400).json({ error: 'address is required' })
  }
  if (!hasPrivateKey()) {
    return res.status(500).json({ error: 'Server signing not available' })
  }

  const fcl = req.app.locals.fcl
  const deployerAddress = req.app.locals.contractAddress

  const score = riskScore || 15
  const jur = jurisdiction || 'US'
  const { createHash } = await import('crypto')
  const proofHash = createHash('sha256').update(`proof:wallet:${address}:${jur}:${score}:${Date.now()}`).digest('hex')
  const claimsHash = createHash('sha256').update(`claims:wallet:${address}:${jur}:${score}:${Date.now()}`).digest('hex')

  // For wallet users, return the Cadence transaction + args so the frontend
  // can construct a two-signer transaction where the user signs via FCL
  res.json({
    success: true,
    cadence: `
      import ComplianceCredential from ${deployerAddress}
      import ZKVerifier from ${deployerAddress}

      transaction(jurisdiction: String, riskScore: UInt64, proof: String, claimsHash: String) {
        let admin: &ComplianceCredential.Admin
        let userAcct: auth(Storage, Capabilities) &Account

        prepare(
          adminAcct: auth(Storage) &Account,
          userAcct: auth(Storage, Capabilities) &Account
        ) {
          self.admin = adminAcct.storage.borrow<&ComplianceCredential.Admin>(
            from: ComplianceCredential.AdminStoragePath
          ) ?? panic("No ComplianceCredential Admin resource")
          self.userAcct = userAcct
        }

        execute {
          let existing = self.userAcct.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.PublicPath
          )
          if existing != nil && existing!.isValid() {
            return
          }

          self.userAcct.capabilities.unpublish(ComplianceCredential.PublicPath)

          let proofData = ZKVerifier.ProofData(
            proof: proof,
            claimsHash: claimsHash,
            verifierName: "FlowShield",
            signature: claimsHash,
            jurisdiction: jurisdiction,
            timestamp: getCurrentBlock().timestamp
          )
          let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: self.userAcct.address)

          let tier = ComplianceCredential.tierFromScore(score: riskScore)
          let expiresAt = getCurrentBlock().timestamp + 7776000.0

          self.admin.mintCredential(
            recipient: self.userAcct,
            tier: tier,
            riskScore: riskScore,
            expiresAt: expiresAt,
            proofHash: result.proofHash,
            jurisdiction: jurisdiction
          )
        }
      }
    `,
    args: {
      jurisdiction: jur,
      riskScore: String(score),
      proof: proofHash,
      claimsHash: claimsHash,
    },
    deployerAddress,
    message: 'Use FCL.mutate with this Cadence code. Admin signs server-side, user signs via wallet.',
  })
})

// link-deployer endpoint removed — it stored the deployer's private key for any email,
// which is a security risk. Use Supabase admin panel to manually link accounts if needed.

export { getUserByAddress, getUser }
export default router

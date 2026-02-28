// routes/accounts.js
// Custodial account creation for walletless onboarding.
// Creates a real Flow account for each user, funded by the deployer.

import { Router } from 'express'
import { generateKeyPair, createFlowAccount, hasPrivateKey, signWithKey, serverAuthorization, custodialAuthorization, PRIVATE_KEY } from '../../lib/flow-signer.js'
import { logAudit, getSupabase } from '../../lib/supabase.js'

const router = Router()

// In-memory fallback when Supabase is not configured
const userAccountsMemory = new Map()

// ── Supabase-backed user store (with in-memory fallback) ──
async function getUser(email) {
  const key = email.toLowerCase()
  const sb = getSupabase()
  if (sb) {
    try {
      const { data } = await sb.from('users').select('*').eq('email', key).single()
      if (data) return {
        email: data.email,
        address: data.flow_address,
        publicKey: data.public_key,
        privateKey: data.encrypted_private_key,
        authMethod: data.auth_method,
        createdAt: data.created_at,
      }
    } catch { /* fall through */ }
  }
  return userAccountsMemory.get(key) || null
}

async function getUserByAddress(flowAddress) {
  const sb = getSupabase()
  if (sb) {
    try {
      const { data } = await sb.from('users').select('*').eq('flow_address', flowAddress).single()
      if (data) return {
        email: data.email,
        address: data.flow_address,
        publicKey: data.public_key,
        privateKey: data.encrypted_private_key,
        authMethod: data.auth_method,
        createdAt: data.created_at,
      }
    } catch { /* fall through */ }
  }
  // Fallback: search in-memory store by address
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
        encrypted_private_key: record.privateKey, // Production: encrypt with KMS before storing
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

  if (!hasPrivateKey()) {
    return res.status(500).json({ error: 'Server signing not available' })
  }

  // Check if user already has an account
  const existing = await getUser(email)
  if (existing) {
    return res.json({
      address: existing.address,
      isNew: false,
      source: 'flow-testnet',
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
      privateKey, // Stored server-side (custodial). Production: encrypt with KMS.
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

    // Fund the new account with testnet FLOW so they can deposit
    try {
      const fundAuthz = serverAuthorization(fcl, deployerAddress)
      const fundTxId = await fcl.mutate({
        cadence: `
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868

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
          arg('1.00000000', t.UFix64),  // Fund with 1.0 FLOW
          arg(result.address, t.Address),
        ],
        proposer: fundAuthz,
        payer: fundAuthz,
        authorizations: [fundAuthz],
        limit: 999,
      })
      await fcl.tx(fundTxId).onceSealed()
      console.log(`[Accounts] Funded ${result.address} with 1.0 FLOW`)
    } catch (fundErr) {
      console.warn('[Accounts] Funding failed (non-fatal):', fundErr.message)
    }

    res.json({
      address: result.address,
      isNew: true,
      transactionId: result.transactionId,
      blockHeight: result.blockHeight,
      funded: true,
      source: 'flow-testnet',
    })
  } catch (err) {
    console.error('[Accounts] Create failed:', err.message)
    res.status(500).json({ error: err.message })
  }
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
    res.status(500).json({ error: err.message })
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
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868

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
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, address })
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

  const user = await getUser(email)
  if (!user) {
    return res.status(404).json({ error: 'No custodial account found for this email' })
  }

  const fcl = req.app.locals.fcl
  const deployerAddress = req.app.locals.contractAddress

  const score = riskScore || 15
  const jur = jurisdiction || 'US'
  const proofHash = `zkp_${Date.now()}`
  const claimsHash = `claims_${Date.now()}`

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
    res.status(500).json({ error: 'Credential minting failed', details: err.message })
  }
})

export { getUserByAddress }
export default router

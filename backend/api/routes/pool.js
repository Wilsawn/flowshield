// routes/pool.js
// Sends REAL Flow transactions to DemoLendingPool on testnet.
// Uses custodial signing for real FLOW token transfers.

import { Router } from 'express'
import { serverAuthorization, custodialAuthorization, hasPrivateKey } from '../../lib/flow-signer.js'
import { logAudit } from '../../lib/supabase.js'
import { getUserByAddress, getUser } from './accounts.js'

const router = Router()
const PRIVATE_KEY = hasPrivateKey()

// POST /api/pool/mint-credential — Mint a compliance credential
// If userAddress is a custodial account, mints TO the user's account (multi-auth).
// Otherwise falls back to minting to the deployer's account.
router.post('/mint-credential', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const userAddress = req.body.userAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }

  try {
    const deployerAuthz = serverAuthorization(fcl, contractAddress)
    const jurisdiction = req.body.jurisdiction || 'US'
    const proofId = req.body.proofHash || `zkp_${Date.now()}_${jurisdiction}`
    const claimsId = req.body.claimsHash || `claims_${Date.now()}`
    const riskScore = String(req.body.riskScore || 15)

    // Check if this is a custodial user (we have their private key).
    // Also accept an email for lookup (more reliable after Railway redeploys
    // which wipe the in-memory address→user mapping).
    let custodialUser = null
    if (req.body.email) {
      custodialUser = await getUser(req.body.email)
    }
    if (!custodialUser && userAddress && userAddress !== contractAddress) {
      custodialUser = await getUserByAddress(userAddress)
    }

    // If a specific user address was requested but we cannot find their key,
    // refuse rather than silently minting the credential to the deployer's account.
    if (!custodialUser && userAddress && userAddress !== contractAddress) {
      return res.status(422).json({
        error: 'Custodial account record not found for this address. Your session may have expired — please re-onboard.',
        userAddress,
        source: 'error',
      })
    }

    let txId
    if (custodialUser) {
      // Multi-auth: deployer (admin) + user (storage for credential)
      const userAuthz = custodialAuthorization(fcl, custodialUser.address, custodialUser.privateKey)

      txId = await fcl.mutate({
        cadence: `
          import ComplianceCredential from 0x${fcl.sansPrefix(contractAddress)}
          import ZKVerifier from 0x${fcl.sansPrefix(contractAddress)}

          transaction(jurisdiction: String, riskScore: UInt64, proof: String, claimsHash: String) {
            let admin: &ComplianceCredential.Admin
            let userAcct: auth(Storage, Capabilities) &Account

            prepare(deployer: auth(Storage) &Account, user: auth(Storage, Capabilities) &Account) {
              self.admin = deployer.storage.borrow<&ComplianceCredential.Admin>(
                from: ComplianceCredential.AdminStoragePath
              ) ?? panic("No admin resource")
              self.userAcct = user
            }

            execute {
              let existing = self.userAcct.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
                ComplianceCredential.PublicPath
              )
              if existing != nil && existing!.isValid() {
                return
              }

              let tier = ComplianceCredential.tierFromScore(score: riskScore)
              let expiresAt = getCurrentBlock().timestamp + 7776000.0

              let proofData = ZKVerifier.ProofData(
                proof: proof,
                claimsHash: claimsHash,
                verifierName: "FlowShield",
                signature: claimsHash,
                jurisdiction: jurisdiction,
                timestamp: getCurrentBlock().timestamp
              )
              let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: self.userAcct.address)

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
          arg(jurisdiction, t.String),
          arg(riskScore, t.UInt64),
          arg(proofId, t.String),
          arg(claimsId, t.String),
        ],
        proposer: deployerAuthz,
        payer: deployerAuthz,
        authorizations: [deployerAuthz, userAuthz],
        limit: 999,
      })
    } else {
      // Fallback: deployer-only minting (for non-custodial or deployer address)
      txId = await fcl.mutate({
        cadence: `
          import ComplianceCredential from 0x${fcl.sansPrefix(contractAddress)}
          import ZKVerifier from 0x${fcl.sansPrefix(contractAddress)}

          transaction(jurisdiction: String, riskScore: UInt64, proof: String, claimsHash: String) {
            let admin: &ComplianceCredential.Admin
            let acct: auth(Storage, Capabilities) &Account

            prepare(signer: auth(Storage, Capabilities) &Account) {
              self.admin = signer.storage.borrow<&ComplianceCredential.Admin>(
                from: ComplianceCredential.AdminStoragePath
              ) ?? panic("No admin resource")
              self.acct = signer
            }

            execute {
              let existing = self.acct.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
                ComplianceCredential.PublicPath
              )
              if existing != nil && existing!.isValid() {
                return
              }

              let tier = ComplianceCredential.tierFromScore(score: riskScore)
              let expiresAt = getCurrentBlock().timestamp + 7776000.0

              let proofData = ZKVerifier.ProofData(
                proof: proof,
                claimsHash: claimsHash,
                verifierName: "FlowShield",
                signature: claimsHash,
                jurisdiction: jurisdiction,
                timestamp: getCurrentBlock().timestamp
              )
              let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: self.acct.address)

              self.admin.mintCredential(
                recipient: self.acct,
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
          arg(jurisdiction, t.String),
          arg(riskScore, t.UInt64),
          arg(proofId, t.String),
          arg(claimsId, t.String),
        ],
        proposer: deployerAuthz,
        payer: deployerAuthz,
        authorizations: [deployerAuthz],
        limit: 999,
      })
    }

    const txResult = await fcl.tx(txId).onceSealed()

    logAudit({ action: 'credential_mint', agent: 'pool', detail: { transactionId: txId, userAddress: custodialUser?.address || contractAddress, blockHeight: txResult.blockHeight }, severity: 'info' })

    res.json({
      success: true,
      transactionId: txId,
      mintedTo: custodialUser ? custodialUser.address : contractAddress,
      status: txResult.status,
      events: txResult.events?.map(e => ({
        type: e.type,
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, source: 'error' })
  }
})

// GET /api/pool/position/:userAddress — Get a specific user's deposit/borrow from chain
router.get('/position/:userAddress', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const userAddress = req.params.userAddress

  if (!userAddress || !userAddress.startsWith('0x')) {
    return res.status(400).json({ error: 'Valid Flow address required' })
  }

  try {
    const [userDeposit, userBorrow, maxBorrow] = await Promise.all([
      fcl.query({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          access(all) fun main(addr: Address): UFix64 {
            return DemoLendingPool.getDeposit(address: addr)
          }
        `,
        args: (arg, t) => [arg(userAddress, t.Address)],
      }),
      fcl.query({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          access(all) fun main(addr: Address): UFix64 {
            return DemoLendingPool.getBorrow(address: addr)
          }
        `,
        args: (arg, t) => [arg(userAddress, t.Address)],
      }),
      fcl.query({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          access(all) fun main(addr: Address): UFix64 {
            return DemoLendingPool.getMaxBorrow(address: addr)
          }
        `,
        args: (arg, t) => [arg(userAddress, t.Address)],
      }),
    ])

    res.json({
      address: userAddress,
      deposited: parseFloat(userDeposit),
      borrowed: parseFloat(userBorrow),
      maxBorrowRemaining: parseFloat(maxBorrow),
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, source: 'error' })
  }
})

// POST /api/pool/deposit — Real deposit into DemoLendingPool
// Custodial users: real FLOW transfer from user's vault to pool (deployer).
// Non-custodial: deployer-only signing (ledger update + self-transfer events).
router.post('/deposit', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const amount = parseFloat(req.body.amount) || 0
  const userAddress = req.body.userAddress || contractAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0', source: 'error' })
  }

  try {
    const deployerAuthz = serverAuthorization(fcl, contractAddress)
    // Look up custodial user by email first (survives Railway redeploys), then by address
    let custodialUser = null
    if (req.body.email) {
      custodialUser = await getUser(req.body.email)
    }
    if (!custodialUser && userAddress && userAddress !== contractAddress) {
      custodialUser = await getUserByAddress(userAddress)
    }

    // If a specific user address was requested but we cannot find their key, reject
    if (!custodialUser && userAddress && userAddress !== contractAddress) {
      return res.status(422).json({
        error: 'Custodial account not found. Your session may have expired — please re-onboard.',
        userAddress,
        source: 'error',
      })
    }

    let txId
    if (custodialUser) {
      // Real FLOW transfer: user → deployer (pool)
      const userAuthz = custodialAuthorization(fcl, custodialUser.address, custodialUser.privateKey)

      txId = await fcl.mutate({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868

          transaction(amount: UFix64, poolAddress: Address) {
            let userAddress: Address

            prepare(user: auth(Storage) &Account) {
              self.userAddress = user.address

              // Withdraw real FLOW from user's vault
              let vault = user.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                from: /storage/flowTokenVault
              ) ?? panic("No FlowToken vault")
              let tokens <- vault.withdraw(amount: amount)

              // Send to pool (deployer address)
              let receiver = getAccount(poolAddress).capabilities.borrow<&{FungibleToken.Receiver}>(
                /public/flowTokenReceiver
              ) ?? panic("Pool receiver not found")
              receiver.deposit(from: <- tokens)
            }

            execute {
              DemoLendingPool.deposit(depositor: self.userAddress, amount: amount)
            }
          }
        `,
        args: (arg, t) => [
          arg(amount.toFixed(8), t.UFix64),
          arg(contractAddress, t.Address),
        ],
        proposer: userAuthz,
        payer: deployerAuthz,
        authorizations: [userAuthz],
        limit: 999,
      })
    } else {
      // Non-custodial fallback: deployer signs everything
      txId = await fcl.mutate({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}

          transaction(amount: UFix64, depositor: Address) {
            prepare(signer: auth(Storage) &Account) {}
            execute {
              DemoLendingPool.deposit(depositor: depositor, amount: amount)
            }
          }
        `,
        args: (arg, t) => [
          arg(amount.toFixed(8), t.UFix64),
          arg(userAddress, t.Address),
        ],
        proposer: deployerAuthz,
        payer: deployerAuthz,
        authorizations: [deployerAuthz],
        limit: 999,
      })
    }

    const txResult = await fcl.tx(txId).onceSealed()

    logAudit({ action: 'pool_deposit', agent: 'pool', detail: { transactionId: txId, amount, userAddress, realTransfer: !!custodialUser, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    res.json({
      success: txResult.status === 4,
      transactionId: txId,
      action: 'deposit',
      amount: amount,
      userAddress,
      realTransfer: !!custodialUser,
      status: txResult.status,
      statusText: txResult.status === 4 ? 'SEALED' : 'FAILED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, action: 'deposit', source: 'error' })
  }
})

// POST /api/pool/borrow — Real borrow from DemoLendingPool
// Custodial users: deployer sends real FLOW to user's account.
// Non-custodial: deployer-only signing (ledger update only).
router.post('/borrow', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const amount = parseFloat(req.body.amount) || 0
  const userAddress = req.body.userAddress || contractAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0', source: 'error' })
  }

  try {
    const deployerAuthz = serverAuthorization(fcl, contractAddress)
    // Look up custodial user by email first (survives Railway redeploys), then by address
    let custodialUser = null
    if (req.body.email) {
      custodialUser = await getUser(req.body.email)
    }
    if (!custodialUser && userAddress && userAddress !== contractAddress) {
      custodialUser = await getUserByAddress(userAddress)
    }

    // If a specific user address was requested but we cannot find their key, reject
    if (!custodialUser && userAddress && userAddress !== contractAddress) {
      return res.status(422).json({
        error: 'Custodial account not found. Your session may have expired — please re-onboard.',
        userAddress,
        source: 'error',
      })
    }

    let txId
    if (custodialUser) {
      // Real FLOW transfer: deployer (pool) → user
      txId = await fcl.mutate({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868

          transaction(amount: UFix64, borrowerAddress: Address) {
            prepare(deployer: auth(Storage) &Account) {
              // Withdraw real FLOW from pool (deployer)
              let vault = deployer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                from: /storage/flowTokenVault
              ) ?? panic("No FlowToken vault")
              let tokens <- vault.withdraw(amount: amount)

              // Send to borrower's account
              let receiver = getAccount(borrowerAddress).capabilities.borrow<&{FungibleToken.Receiver}>(
                /public/flowTokenReceiver
              ) ?? panic("Borrower receiver not found")
              receiver.deposit(from: <- tokens)
            }

            execute {
              DemoLendingPool.borrow(borrower: borrowerAddress, amount: amount)
            }
          }
        `,
        args: (arg, t) => [
          arg(amount.toFixed(8), t.UFix64),
          arg(custodialUser.address, t.Address),
        ],
        proposer: deployerAuthz,
        payer: deployerAuthz,
        authorizations: [deployerAuthz],
        limit: 999,
      })
    } else {
      // Non-custodial fallback
      txId = await fcl.mutate({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}

          transaction(amount: UFix64, borrower: Address) {
            prepare(signer: auth(Storage) &Account) {}
            execute {
              DemoLendingPool.borrow(borrower: borrower, amount: amount)
            }
          }
        `,
        args: (arg, t) => [
          arg(amount.toFixed(8), t.UFix64),
          arg(userAddress, t.Address),
        ],
        proposer: deployerAuthz,
        payer: deployerAuthz,
        authorizations: [deployerAuthz],
        limit: 999,
      })
    }

    const txResult = await fcl.tx(txId).onceSealed()

    logAudit({ action: 'pool_borrow', agent: 'pool', detail: { transactionId: txId, amount, userAddress, realTransfer: !!custodialUser, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    res.json({
      success: txResult.status === 4,
      transactionId: txId,
      action: 'borrow',
      amount: amount,
      userAddress,
      realTransfer: !!custodialUser,
      status: txResult.status,
      statusText: txResult.status === 4 ? 'SEALED' : 'FAILED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, action: 'borrow', source: 'error' })
  }
})

// POST /api/pool/repay — Repay a borrow in DemoLendingPool
// Custodial users: real FLOW transfer from user's vault back to pool (deployer).
// Non-custodial: deployer-only signing (ledger update only).
router.post('/repay', async (req, res) => {
  const fcl = req.app.locals.fcl
  const contractAddress = req.app.locals.contractAddress
  const amount = parseFloat(req.body.amount) || 0
  const userAddress = req.body.userAddress || contractAddress

  if (!PRIVATE_KEY) {
    return res.status(500).json({ error: 'Private key not available', source: 'error' })
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0', source: 'error' })
  }

  try {
    const deployerAuthz = serverAuthorization(fcl, contractAddress)
    // Look up custodial user by email first (survives Railway redeploys), then by address
    let custodialUser = null
    if (req.body.email) {
      custodialUser = await getUser(req.body.email)
    }
    if (!custodialUser && userAddress && userAddress !== contractAddress) {
      custodialUser = await getUserByAddress(userAddress)
    }

    // If a specific user address was requested but we cannot find their key, reject
    if (!custodialUser && userAddress && userAddress !== contractAddress) {
      return res.status(422).json({
        error: 'Custodial account not found. Your session may have expired — please re-onboard.',
        userAddress,
        source: 'error',
      })
    }

    let txId
    if (custodialUser) {
      // Real FLOW transfer: user → deployer (pool)
      const userAuthz = custodialAuthorization(fcl, custodialUser.address, custodialUser.privateKey)

      txId = await fcl.mutate({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868

          transaction(amount: UFix64, poolAddress: Address) {
            let userAddress: Address

            prepare(user: auth(Storage) &Account) {
              self.userAddress = user.address

              // Withdraw real FLOW from user's vault
              let vault = user.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                from: /storage/flowTokenVault
              ) ?? panic("No FlowToken vault")
              let tokens <- vault.withdraw(amount: amount)

              // Send back to pool (deployer address)
              let receiver = getAccount(poolAddress).capabilities.borrow<&{FungibleToken.Receiver}>(
                /public/flowTokenReceiver
              ) ?? panic("Pool receiver not found")
              receiver.deposit(from: <- tokens)
            }

            execute {
              DemoLendingPool.repay(borrower: self.userAddress, amount: amount)
            }
          }
        `,
        args: (arg, t) => [
          arg(amount.toFixed(8), t.UFix64),
          arg(contractAddress, t.Address),
        ],
        proposer: userAuthz,
        payer: deployerAuthz,
        authorizations: [userAuthz],
        limit: 999,
      })
    } else {
      // Non-custodial fallback
      txId = await fcl.mutate({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}

          transaction(amount: UFix64, borrower: Address) {
            prepare(signer: auth(Storage) &Account) {}
            execute {
              DemoLendingPool.repay(borrower: borrower, amount: amount)
            }
          }
        `,
        args: (arg, t) => [
          arg(amount.toFixed(8), t.UFix64),
          arg(userAddress, t.Address),
        ],
        proposer: deployerAuthz,
        payer: deployerAuthz,
        authorizations: [deployerAuthz],
        limit: 999,
      })
    }

    const txResult = await fcl.tx(txId).onceSealed()

    logAudit({ action: 'pool_repay', agent: 'pool', detail: { transactionId: txId, amount, userAddress, realTransfer: !!custodialUser, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    res.json({
      success: txResult.status === 4,
      transactionId: txId,
      action: 'repay',
      amount: amount,
      userAddress,
      realTransfer: !!custodialUser,
      status: txResult.status,
      statusText: txResult.status === 4 ? 'SEALED' : 'FAILED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, action: 'repay', source: 'error' })
  }
})

// GET /api/pool/status — Get pool stats from chain
router.get('/status', async (req, res) => {
  const fcl = req.app.locals.fcl
  const address = req.app.locals.contractAddress

  try {
    const [deposits, borrowed, txCount, liquidity, baseAPY, maxLTV, utilRate] = await Promise.all([
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.totalDeposits }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.totalBorrowed }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UInt64 { return DemoLendingPool.totalTransactions }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.availableLiquidity() }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.baseAPY }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.maxLTV }`,
      }),
      fcl.query({
        cadence: `import DemoLendingPool from 0x${fcl.sansPrefix(address)}\naccess(all) fun main(): UFix64 { return DemoLendingPool.utilizationRate() }`,
      }),
    ])

    const apyPct = parseFloat(baseAPY) * 100
    const ltvPct = parseFloat(maxLTV) * 100
    const util = parseFloat(utilRate)
    // Simple interest model: borrow rate = baseAPY + utilization spread
    const borrowRate = parseFloat(baseAPY) + util * 0.02

    res.json({
      totalDeposits: parseFloat(deposits),
      totalBorrowed: parseFloat(borrowed),
      totalTransactions: parseInt(txCount),
      availableLiquidity: parseFloat(liquidity),
      baseAPY: parseFloat(baseAPY),
      baseAPYPercent: apyPct,
      maxLTV: parseFloat(maxLTV),
      maxLTVPercent: ltvPct,
      utilizationRate: util,
      borrowRatePercent: +(borrowRate * 100).toFixed(2),
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: err.message, source: 'error' })
  }
})

export default router

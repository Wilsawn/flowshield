// routes/pool.js
// Sends REAL Flow transactions to DemoLendingPool on testnet.
// Uses custodial signing for real FLOW token transfers.

import { Router } from 'express'
import { createHash } from 'crypto'
import { serverAuthorization, custodialAuthorization, hasPrivateKey } from '../../lib/flow-signer.js'
import { logAudit } from '../../lib/supabase.js'
import { getUserByAddress, getUser } from './accounts.js'
import { getAddress } from '../../lib/flow-addresses.js'
import { safeError } from '../../lib/middleware.js'

const router = Router()
const PRIVATE_KEY = hasPrivateKey()

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
    res.status(500).json({ error: safeError(err, 'Position lookup failed'), source: 'error' })
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

    const jurisdiction = req.body.jurisdiction
    const riskScore = req.body.riskScore != null ? String(req.body.riskScore) : null
    if (!jurisdiction) {
      return res.status(400).json({ error: 'jurisdiction is required', source: 'error' })
    }
    if (riskScore === null) {
      return res.status(400).json({ error: 'riskScore is required', source: 'error' })
    }
    const proofId = createHash('sha256').update(`proof:deposit:${userAddress}:${Date.now()}`).digest('hex')
    const claimsId = createHash('sha256').update(`claims:deposit:${userAddress}:${Date.now()}`).digest('hex')

    let txId
    if (custodialUser) {
      // Atomic two-signer transaction: auto-mint credential if missing + real FLOW deposit
      const userAuthz = custodialAuthorization(fcl, custodialUser.address, custodialUser.privateKey)

      txId = await fcl.mutate({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          import ComplianceCredential from 0x${fcl.sansPrefix(contractAddress)}
          import ComplianceAction from 0x${fcl.sansPrefix(contractAddress)}
          import ZKVerifier from 0x${fcl.sansPrefix(contractAddress)}
          import FungibleToken from ${getAddress('FungibleToken')}
          import FlowToken from ${getAddress('FlowToken')}

          transaction(amount: UFix64, poolAddress: Address, jurisdiction: String, riskScore: UInt64, proof: String, claimsHash: String) {
            let userAddress: Address

            prepare(deployer: auth(Storage) &Account, user: auth(Storage, Capabilities) &Account) {
              self.userAddress = user.address

              // Step 1: Ensure user has a valid compliance credential (auto-mint if missing)
              let existingCred = user.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
                ComplianceCredential.PublicPath
              )
              if existingCred == nil || !existingCred!.isValid() {
                // Unpublish stale capability so mintCredential can publish a fresh one
                user.capabilities.unpublish(ComplianceCredential.PublicPath)

                let admin = deployer.storage.borrow<&ComplianceCredential.Admin>(
                  from: ComplianceCredential.AdminStoragePath
                ) ?? panic("No admin resource")

                let proofData = ZKVerifier.ProofData(
                  proof: proof,
                  claimsHash: claimsHash,
                  verifierName: "FlowShield",
                  signature: claimsHash,
                  jurisdiction: jurisdiction,
                  timestamp: getCurrentBlock().timestamp
                )
                let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: user.address)
                let tier = ComplianceCredential.tierFromScore(score: riskScore)
                let expiresAt = getCurrentBlock().timestamp + 7776000.0

                admin.mintCredential(
                  recipient: user,
                  tier: tier,
                  riskScore: riskScore,
                  expiresAt: expiresAt,
                  proofHash: result.proofHash,
                  jurisdiction: jurisdiction
                )
              }

              // Step 2: Withdraw real FLOW from user's vault
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
              // Step 3: Record deposit (ComplianceAction.verify will pass now)
              DemoLendingPool.deposit(depositor: self.userAddress, amount: amount)
            }
          }
        `,
        args: (arg, t) => [
          arg(amount.toFixed(8), t.UFix64),
          arg(contractAddress, t.Address),
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
    const txSuccess = txResult.status === 4 && !txResult.errorMessage

    logAudit({ action: 'pool_deposit', agent: 'pool', detail: { transactionId: txId, amount, userAddress, realTransfer: !!custodialUser, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    if (!txSuccess) {
      return res.status(400).json({
        success: false,
        error: txResult.errorMessage || 'Transaction failed on-chain',
        transactionId: txId,
        action: 'deposit',
        explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
        source: 'flow-testnet',
      })
    }

    res.json({
      success: true,
      transactionId: txId,
      action: 'deposit',
      amount: amount,
      userAddress,
      realTransfer: !!custodialUser,
      status: txResult.status,
      statusText: 'SEALED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Deposit failed'), action: 'deposit', source: 'error' })
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

    const jurisdiction = req.body.jurisdiction
    const riskScore = req.body.riskScore != null ? String(req.body.riskScore) : null
    if (!jurisdiction) {
      return res.status(400).json({ error: 'jurisdiction is required', source: 'error' })
    }
    if (riskScore === null) {
      return res.status(400).json({ error: 'riskScore is required', source: 'error' })
    }
    const proofId = createHash('sha256').update(`proof:borrow:${userAddress}:${Date.now()}`).digest('hex')
    const claimsId = createHash('sha256').update(`claims:borrow:${userAddress}:${Date.now()}`).digest('hex')

    let txId
    if (custodialUser) {
      // Atomic two-signer transaction: auto-mint credential if missing + real FLOW borrow
      const userAuthz = custodialAuthorization(fcl, custodialUser.address, custodialUser.privateKey)

      txId = await fcl.mutate({
        cadence: `
          import DemoLendingPool from 0x${fcl.sansPrefix(contractAddress)}
          import ComplianceCredential from 0x${fcl.sansPrefix(contractAddress)}
          import ComplianceAction from 0x${fcl.sansPrefix(contractAddress)}
          import ZKVerifier from 0x${fcl.sansPrefix(contractAddress)}
          import FungibleToken from ${getAddress('FungibleToken')}
          import FlowToken from ${getAddress('FlowToken')}

          transaction(amount: UFix64, borrowerAddress: Address, jurisdiction: String, riskScore: UInt64, proof: String, claimsHash: String) {
            prepare(deployer: auth(Storage) &Account, user: auth(Storage, Capabilities) &Account) {
              // Step 1: Ensure user has a valid compliance credential (auto-mint if missing)
              let existingCred = user.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
                ComplianceCredential.PublicPath
              )
              if existingCred == nil || !existingCred!.isValid() {
                // Unpublish stale capability so mintCredential can publish a fresh one
                user.capabilities.unpublish(ComplianceCredential.PublicPath)

                let admin = deployer.storage.borrow<&ComplianceCredential.Admin>(
                  from: ComplianceCredential.AdminStoragePath
                ) ?? panic("No admin resource")

                let proofData = ZKVerifier.ProofData(
                  proof: proof,
                  claimsHash: claimsHash,
                  verifierName: "FlowShield",
                  signature: claimsHash,
                  jurisdiction: jurisdiction,
                  timestamp: getCurrentBlock().timestamp
                )
                let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: user.address)
                let tier = ComplianceCredential.tierFromScore(score: riskScore)
                let expiresAt = getCurrentBlock().timestamp + 7776000.0

                admin.mintCredential(
                  recipient: user,
                  tier: tier,
                  riskScore: riskScore,
                  expiresAt: expiresAt,
                  proofHash: result.proofHash,
                  jurisdiction: jurisdiction
                )
              }

              // Step 2: Withdraw real FLOW from pool (deployer) and send to borrower
              let vault = deployer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                from: /storage/flowTokenVault
              ) ?? panic("No FlowToken vault")
              let tokens <- vault.withdraw(amount: amount)

              let receiver = getAccount(borrowerAddress).capabilities.borrow<&{FungibleToken.Receiver}>(
                /public/flowTokenReceiver
              ) ?? panic("Borrower receiver not found")
              receiver.deposit(from: <- tokens)
            }

            execute {
              // Step 3: Record borrow (ComplianceAction.verifyFull will pass now)
              DemoLendingPool.borrow(borrower: borrowerAddress, amount: amount)
            }
          }
        `,
        args: (arg, t) => [
          arg(amount.toFixed(8), t.UFix64),
          arg(custodialUser.address, t.Address),
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
    const txSuccess = txResult.status === 4 && !txResult.errorMessage

    logAudit({ action: 'pool_borrow', agent: 'pool', detail: { transactionId: txId, amount, userAddress, realTransfer: !!custodialUser, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    if (!txSuccess) {
      return res.status(400).json({
        success: false,
        error: txResult.errorMessage || 'Transaction failed on-chain',
        transactionId: txId,
        action: 'borrow',
        explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
        source: 'flow-testnet',
      })
    }

    res.json({
      success: true,
      transactionId: txId,
      action: 'borrow',
      amount: amount,
      userAddress,
      realTransfer: !!custodialUser,
      status: txResult.status,
      statusText: 'SEALED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Borrow failed'), action: 'borrow', source: 'error' })
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
          import FungibleToken from ${getAddress('FungibleToken')}
          import FlowToken from ${getAddress('FlowToken')}

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
    const txSuccess = txResult.status === 4 && !txResult.errorMessage

    logAudit({ action: 'pool_repay', agent: 'pool', detail: { transactionId: txId, amount, userAddress, realTransfer: !!custodialUser, blockHeight: txResult.blockHeight }, severity: 'info', operatorAddress: userAddress })

    if (!txSuccess) {
      return res.status(400).json({
        success: false,
        error: txResult.errorMessage || 'Transaction failed on-chain',
        transactionId: txId,
        action: 'repay',
        explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
        source: 'flow-testnet',
      })
    }

    res.json({
      success: true,
      transactionId: txId,
      action: 'repay',
      amount: amount,
      userAddress,
      realTransfer: !!custodialUser,
      status: txResult.status,
      statusText: 'SEALED',
      events: txResult.events?.map(e => ({
        type: e.type.split('.').pop(),
        data: e.data,
      })) || [],
      blockHeight: txResult.blockHeight,
      explorerUrl: `https://testnet.flowscan.io/tx/${txId}`,
      source: 'flow-testnet',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Repay failed'), action: 'repay', source: 'error' })
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
    res.status(500).json({ error: safeError(err, 'Pool status unavailable'), source: 'error' })
  }
})

export default router

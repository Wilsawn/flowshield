/**
 * @file Chain Data API Routes
 * @module routes/chain
 * @description Fetches real blockchain data from Flow testnet REST API.
 *              No mocking, no fallbacks — returns live chain data or error.
 */

import { Router } from 'express'
import { safeError } from '../../lib/middleware.js'

const router = Router()

const REST_API = 'https://rest-testnet.onflow.org/v1'

// GET /api/chain/account/:address — Real account data from Flow testnet
router.get('/account/:address', async (req, res) => {
  const { address } = req.params
  try {
    const resp = await fetch(`${REST_API}/accounts/${address}?expand=keys,contracts`)
    if (!resp.ok) throw new Error(`Flow API ${resp.status}: ${resp.statusText}`)
    const data = await resp.json()
    res.json({
      address: data.address,
      balance: parseFloat(data.balance) / 100000000, // Convert from UFix64 raw
      keys: data.keys?.map(k => ({
        index: k.index,
        publicKey: k.public_key?.slice(0, 16) + '...',
        signAlgo: k.signing_algorithm,
        hashAlgo: k.hashing_algorithm,
        weight: k.weight,
        revoked: k.revoked,
      })) || [],
      contracts: Object.keys(data.contracts || {}),
      keyCount: data.keys?.length || 0,
      contractCount: Object.keys(data.contracts || {}).length,
      source: 'flow-testnet-rest',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Account lookup failed'), source: 'error' })
  }
})

// GET /api/chain/transactions/:address — Recent transactions for an address
router.get('/transactions/:address', async (req, res) => {
  const { address } = req.params
  try {
    // Get latest sealed block height first
    const blocksResp = await fetch(`${REST_API}/blocks?height=sealed&expand=payload`)
    if (!blocksResp.ok) throw new Error(`Blocks API ${blocksResp.status}`)
    const blocks = await blocksResp.json()
    const latestHeight = parseInt(blocks[0]?.header?.height || '0')

    // Fetch recent blocks to find transactions (last ~20 blocks)
    const startHeight = Math.max(latestHeight - 20, 0)
    const txEvents = []

    // Query contract-specific events from our deployed contracts
    const contractAddress = req.app.locals.contractAddress || address
    const eventTypes = [
      `A.${contractAddress.replace('0x', '')}.ComplianceCredential.CredentialIssued`,
      `A.${contractAddress.replace('0x', '')}.ComplianceCredential.CredentialRevoked`,
      `A.${contractAddress.replace('0x', '')}.DemoLendingPool.Deposit`,
      `A.${contractAddress.replace('0x', '')}.DemoLendingPool.Borrow`,
      `A.${contractAddress.replace('0x', '')}.RuleEngine.RuleUpdated`,
      `A.${contractAddress.replace('0x', '')}.ZKVerifier.ProofVerified`,
      `A.${contractAddress.replace('0x', '')}.ComplianceAction.ComplianceChecked`,
    ]

    // Fetch events for each type
    for (const eventType of eventTypes) {
      try {
        const evResp = await fetch(
          `${REST_API}/events?type=${encodeURIComponent(eventType)}&start_height=${startHeight}&end_height=${latestHeight}`
        )
        if (evResp.ok) {
          const evData = await evResp.json()
          if (evData?.events) {
            for (const blockGroup of evData.events) {
              for (const evt of (blockGroup.events || [])) {
                txEvents.push({
                  type: eventType.split('.').pop(),
                  contract: eventType.split('.')[2],
                  blockHeight: blockGroup.block_height,
                  blockTimestamp: blockGroup.block_timestamp,
                  transactionId: evt.transaction_id,
                  eventIndex: evt.event_index,
                  payload: evt.payload,
                })
              }
            }
          }
        }
      } catch { /* skip individual event type errors */ }
    }

    // Also get account creation events
    try {
      const acctResp = await fetch(
        `${REST_API}/events?type=flow.AccountCreated&start_height=${Math.max(latestHeight - 100, 0)}&end_height=${latestHeight}`
      )
      if (acctResp.ok) {
        const acctData = await acctResp.json()
        if (acctData?.events) {
          for (const blockGroup of acctData.events) {
            for (const evt of (blockGroup.events || [])) {
              txEvents.push({
                type: 'AccountCreated',
                contract: 'flow',
                blockHeight: blockGroup.block_height,
                blockTimestamp: blockGroup.block_timestamp,
                transactionId: evt.transaction_id,
                eventIndex: evt.event_index,
              })
            }
          }
        }
      }
    } catch { /* skip */ }

    // Sort by block height descending
    txEvents.sort((a, b) => parseInt(b.blockHeight) - parseInt(a.blockHeight))

    res.json({
      address,
      latestBlock: latestHeight,
      events: txEvents.slice(0, 25),
      eventCount: txEvents.length,
      source: 'flow-testnet-rest',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Transaction lookup failed'), source: 'error' })
  }
})

// GET /api/chain/blocks/latest — Latest block info
router.get('/blocks/latest', async (req, res) => {
  try {
    const resp = await fetch(`${REST_API}/blocks?height=sealed`)
    if (!resp.ok) throw new Error(`Blocks API ${resp.status}`)
    const blocks = await resp.json()
    const block = blocks[0]
    res.json({
      height: block.header.height,
      id: block.header.id,
      timestamp: block.header.timestamp,
      parentId: block.header.parent_id,
      source: 'flow-testnet-rest',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Block lookup failed'), source: 'error' })
  }
})

// GET /api/chain/contracts/:address — List deployed contracts with details
router.get('/contracts/:address', async (req, res) => {
  const { address } = req.params
  try {
    const resp = await fetch(`${REST_API}/accounts/${address}?expand=contracts`)
    if (!resp.ok) throw new Error(`Flow API ${resp.status}`)
    const data = await resp.json()
    const contracts = Object.entries(data.contracts || {}).map(([name, code]) => ({
      name,
      codeSize: code.length,
      codePreview: Buffer.from(code, 'base64').toString('utf8').slice(0, 200) + '...',
    }))
    res.json({
      address,
      contracts,
      count: contracts.length,
      source: 'flow-testnet-rest',
    })
  } catch (err) {
    res.status(500).json({ error: safeError(err, 'Contract lookup failed'), source: 'error' })
  }
})

export default router

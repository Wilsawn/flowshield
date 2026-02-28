import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import * as fcl from '@onflow/fcl'

import complianceRoutes from './routes/compliance.js'
import riskRoutes from './routes/risk.js'
import copilotRoutes from './routes/copilot.js'
import kycRoutes from './routes/kyc.js'
import chainRoutes from './routes/chain.js'
import poolRoutes from './routes/pool.js'
import adminRoutes from './routes/admin.js'
import subscriptionRoutes from './routes/subscription.js'
import governanceRoutes from './routes/governance.js'
import accountsRoutes from './routes/accounts.js'
import { requireApiKey, rateLimit } from '../lib/middleware.js'
import { getSupabase } from '../lib/supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env from root project dir (for shared keys like VERIFF, CLAUDE)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
// Load backend-specific .env (overrides root if both exist)
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true })

const app = express()
// Railway sets PORT automatically. Locally, use BACKEND_PORT to avoid conflict with frontend.
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3002

// ── Middleware ──
app.use(cors({ origin: true }))
app.use(express.json())
app.use(rateLimit({ windowMs: 60000, max: 200 }))

// ── Configure FCL for Flow testnet ──
const FLOW_NETWORK = process.env.FLOW_NETWORK || 'testnet'
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x93c691a98b975493'

fcl.config()
  .put('flow.network', FLOW_NETWORK)
  .put('accessNode.api', FLOW_NETWORK === 'testnet'
    ? 'https://rest-testnet.onflow.org'
    : 'http://localhost:8888'
  )
  .put('0xComplianceCredential', CONTRACT_ADDRESS)
  .put('0xComplianceAction', CONTRACT_ADDRESS)
  .put('0xZKVerifier', CONTRACT_ADDRESS)
  .put('0xRuleEngine', CONTRACT_ADDRESS)
  .put('0xDemoLendingPool', CONTRACT_ADDRESS)
  .put('0xComplianceAgent', CONTRACT_ADDRESS)

// Make FCL and contract address available to routes
app.locals.fcl = fcl
app.locals.contractAddress = CONTRACT_ADDRESS

// ── Routes ──
// Public read endpoints — no auth required
app.use('/api/compliance', complianceRoutes)
app.use('/api/risk', riskRoutes)
app.use('/api/chain', chainRoutes)
app.use('/api/kyc', kycRoutes)

// User-facing write endpoints — protected by API key in production
app.use('/api/pool', poolRoutes)
app.use('/api/copilot', copilotRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/governance', governanceRoutes)
app.use('/api/accounts', accountsRoutes)

// Admin-only — always require API key when Supabase is configured
app.use('/api/admin', requireApiKey, adminRoutes)

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    network: FLOW_NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    timestamp: new Date().toISOString(),
  })
})

// ── Process-level error handlers (prevent silent crashes on Railway) ──
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message)
  console.error(err.stack)
})
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
})

// ── Start server — bind to 0.0.0.0 explicitly for containers ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[FlowShield API] Running on 0.0.0.0:${PORT}`)
  console.log(`[FlowShield API] Flow network: ${FLOW_NETWORK}`)
  console.log(`[FlowShield API] Contract address: ${CONTRACT_ADDRESS}`)
  console.log(`[FlowShield API] Veriff: ${process.env.VERIFF_API_KEY ? 'configured ✓' : 'demo mode (no VERIFF_API_KEY)'}`) 
  console.log(`[FlowShield API] Supabase: ${getSupabase() ? 'connected ✓' : 'not configured (local mode)'}`)
})

export default app

#!/usr/bin/env node

// FlowShield CLI — Developer tool for compliance on Flow blockchain.
// Usage: flowshield <command> [options]
//
// Commands:
//   init                     Generate FlowShield integration code for your Cadence project
//   scan <file>              Scan a Cadence/Solidity file for compliance issues
//   risk <address>           Check risk score for a Flow address
//   monitor <address>        Detect anomalies for a Flow address
//   compliance               Run regulatory compliance scan
//   status                   Check FlowShield API and pool status
//   verify <address>         Check if an address holds a valid compliance credential

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, basename, extname } from 'path'
import { createInterface } from 'readline'

// ── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_API = 'https://flowshield-production.up.railway.app'
const CONTRACT_ADDRESS = '0x93c691a98b975493'

function getApiUrl() {
  return process.env.FLOWSHIELD_API || DEFAULT_API
}

function getApiKey() {
  return process.env.FLOWSHIELD_API_KEY || null
}

function getToken() {
  return process.env.FLOWSHIELD_TOKEN || null
}

// ── Colors (no deps) ────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function banner() {
  console.log(`
${c.cyan}${c.bold}  ╔═══════════════════════════════════════╗
  ║         FlowShield CLI v1.0.0          ║
  ║   Privacy-Preserving DeFi Compliance   ║
  ╚═══════════════════════════════════════╝${c.reset}
`)
}

function log(msg) { console.log(msg) }
function info(msg) { console.log(`${c.cyan}[info]${c.reset} ${msg}`) }
function success(msg) { console.log(`${c.green}[ok]${c.reset} ${msg}`) }
function warn(msg) { console.log(`${c.yellow}[warn]${c.reset} ${msg}`) }
function error(msg) { console.error(`${c.red}[error]${c.reset} ${msg}`) }

function spinner(msg) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const id = setInterval(() => {
    process.stdout.write(`\r${c.cyan}${frames[i++ % frames.length]}${c.reset} ${msg}`)
  }, 80)
  return () => {
    clearInterval(id)
    process.stdout.write('\r' + ' '.repeat(msg.length + 4) + '\r')
  }
}

async function apiFetch(path, options = {}) {
  const url = `${getApiUrl()}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  const apiKey = getApiKey()
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || data.message || `API returned ${res.status}`)
  }
  return data
}

function isFlowAddress(addr) {
  return /^0x[a-fA-F0-9]{16}$/.test(addr)
}

// ── Commands ────────────────────────────────────────────────────────────────

// flowshield init
async function cmdInit() {
  banner()
  info('Generating FlowShield integration for your Cadence project...\n')

  const contractAddr = CONTRACT_ADDRESS

  // Generate the integration example
  const basicExample = `// ── FlowShield Compliance Integration ──
// Import the compliance engine
import ComplianceAction from ${contractAddr}

// Check compliance before any DeFi action
access(all) fun deposit(user: Address, amount: UFix64) {
    let ok = ComplianceAction.verify(user)
    assert(ok, message: "Not compliant")
    // ... deposit logic
}
`

  const fullExample = `// ── FlowShield Full Integration ──
// All available verification methods for your DeFi protocol.

import ComplianceAction from ${contractAddr}
import ComplianceCredential from ${contractAddr}
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

// ── Basic Verification ──
// Use for low-risk operations (deposits, swaps under threshold)
access(all) fun deposit(user: Address, amount: UFix64) {
    let ok = ComplianceAction.verify(user)
    assert(ok, message: "User is not compliant")
    // ... your deposit logic
}

// ── Full Verification ──
// Use for high-risk operations (borrows, large transfers)
// Requires tier == compliant (not semi-compliant)
access(all) fun borrow(user: Address, amount: UFix64) {
    let ok = ComplianceAction.verifyFull(user)
    assert(ok, message: "Full compliance required for borrowing")
    // ... your borrow logic
}

// ── Jurisdiction-Specific Verification ──
// Use when your protocol is restricted to specific jurisdictions
access(all) fun restrictedAction(user: Address) {
    let ok = ComplianceAction.verifyForJurisdiction(user, jurisdiction: "US")
    assert(ok, message: "US compliance required")
    // ... your restricted logic
}

// ── Audit-Grade Verification ──
// Returns a full VerificationRecord for on-chain audit trails
access(all) fun auditedAction(user: Address) {
    let record = ComplianceAction.verifyWithRecord(user)
    assert(record.passed, message: "Compliance check failed")
    // record.tier, record.riskScore, record.jurisdiction available
    // ... your logic with full audit data
}

// ── Paid Verification (Revenue Model) ──
// Protocol pays a small FLOW fee per check (default: 0.001 FLOW)
access(all) fun paidAction(user: Address, payment: @{FungibleToken.Vault}) {
    let ok = ComplianceAction.verifyWithFee(user, payment: <-payment)
    assert(ok, message: "Compliance verification failed")
    // ... your logic
}
`

  // Write files
  const basicPath = 'flowshield-basic.cdc'
  const fullPath = 'flowshield-integration.cdc'

  writeFileSync(basicPath, basicExample)
  writeFileSync(fullPath, fullExample)

  success(`Created ${c.bold}${basicPath}${c.reset} — minimal one-line integration`)
  success(`Created ${c.bold}${fullPath}${c.reset} — full integration with all verification methods\n`)

  log(`${c.dim}── Quick Start ──${c.reset}`)
  log(``)
  log(`  ${c.cyan}1.${c.reset} Copy the import + verify pattern into your contract:`)
  log(``)
  log(`     ${c.green}import ComplianceAction from ${contractAddr}${c.reset}`)
  log(`     ${c.green}let ok = ComplianceAction.verify(userAddress)${c.reset}`)
  log(`     ${c.green}assert(ok, message: "Not compliant")${c.reset}`)
  log(``)
  log(`  ${c.cyan}2.${c.reset} Deploy your contract to Flow testnet`)
  log(`  ${c.cyan}3.${c.reset} Users must hold a ComplianceCredential to pass verification`)
  log(``)
  log(`${c.dim}── API Commands ──${c.reset}`)
  log(``)
  log(`  ${c.bold}flowshield scan <file.cdc>${c.reset}     Scan code for compliance issues`)
  log(`  ${c.bold}flowshield risk <0xAddr>${c.reset}       Check wallet risk score`)
  log(`  ${c.bold}flowshield monitor <0xAddr>${c.reset}    Detect anomalies`)
  log(`  ${c.bold}flowshield verify <0xAddr>${c.reset}     Check credential status`)
  log(`  ${c.bold}flowshield compliance${c.reset}          Run regulatory radar scan`)
  log(`  ${c.bold}flowshield status${c.reset}              API + pool health check`)
  log(``)
  log(`${c.dim}── Environment Variables ──${c.reset}`)
  log(``)
  log(`  FLOWSHIELD_API=${c.cyan}${getApiUrl()}${c.reset}`)
  log(`  FLOWSHIELD_API_KEY=${c.dim}(optional, for API key auth)${c.reset}`)
  log(`  FLOWSHIELD_TOKEN=${c.dim}(optional, for Bearer token auth — needed for scan/compliance)${c.reset}`)
  log(``)
}

// flowshield scan <file>
async function cmdScan(filePath) {
  if (!filePath) {
    error('Usage: flowshield scan <file.cdc>')
    process.exit(1)
  }

  const resolved = resolve(filePath)
  if (!existsSync(resolved)) {
    error(`File not found: ${resolved}`)
    process.exit(1)
  }

  const code = readFileSync(resolved, 'utf-8')
  const ext = extname(filePath).slice(1)
  const langMap = { cdc: 'cadence', sol: 'solidity', js: 'javascript', ts: 'typescript' }
  const language = langMap[ext] || 'cadence'

  banner()
  info(`Scanning ${c.bold}${basename(filePath)}${c.reset} (${language}, ${code.length} chars)...`)

  const stop = spinner('Analyzing code for compliance issues...')

  try {
    const result = await apiFetch('/api/copilot/code-scan', {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    })

    stop()

    // Display results
    log(`\n${c.bold}── Compliance Scan Results ──${c.reset}\n`)

    const score = result.score ?? 0
    const scoreColor = score >= 80 ? c.green : score >= 50 ? c.yellow : c.red
    log(`  Score: ${scoreColor}${c.bold}${score}/100${c.reset}`)
    log(`  Source: ${c.dim}${result.source || 'scanner'}${c.reset}`)

    if (result.issues && result.issues.length > 0) {
      log(`\n  ${c.bold}Issues Found: ${result.issues.length}${c.reset}\n`)

      for (const issue of result.issues) {
        const sevColor = issue.severity === 'critical' ? c.red
          : issue.severity === 'high' ? c.red
          : issue.severity === 'medium' ? c.yellow
          : c.dim
        log(`  ${sevColor}[${issue.severity?.toUpperCase()}]${c.reset} ${issue.issue}`)
        if (issue.location) log(`    ${c.dim}Location: ${issue.location}${c.reset}`)
        if (issue.fix) log(`    ${c.green}Fix: ${issue.fix}${c.reset}`)
        log('')
      }
    } else {
      log(`\n  ${c.green}No compliance issues found.${c.reset}\n`)
    }

    if (result.analysis) {
      log(`${c.dim}── Detailed Analysis ──${c.reset}\n`)
      log(result.analysis)
    }
  } catch (err) {
    stop()
    error(`Scan failed: ${err.message}`)
    process.exit(1)
  }
}

// flowshield risk <address>
async function cmdRisk(address) {
  if (!address || !isFlowAddress(address)) {
    error('Usage: flowshield risk <0xAddress>')
    error('Address must be 0x + 16 hex characters (e.g., 0x93c691a98b975493)')
    process.exit(1)
  }

  banner()
  const stop = spinner(`Assessing risk for ${address}...`)

  try {
    const result = await apiFetch('/api/risk/score', {
      method: 'POST',
      body: JSON.stringify({ address }),
    })

    stop()

    log(`\n${c.bold}── Risk Assessment ──${c.reset}\n`)

    const score = result.score ?? 0
    const scoreColor = score <= 30 ? c.green : score <= 60 ? c.yellow : c.red
    const tierColor = result.tier === 'compliant' ? c.green
      : result.tier === 'semi-compliant' ? c.yellow
      : c.red

    log(`  Address:  ${c.cyan}${address}${c.reset}`)
    log(`  Score:    ${scoreColor}${c.bold}${score}/100${c.reset} ${c.dim}(0=safe, 100=highest risk)${c.reset}`)
    log(`  Tier:     ${tierColor}${c.bold}${result.tier}${c.reset}`)
    log(`  Source:   ${c.dim}${result.analysisSource || 'deterministic'}${c.reset}`)

    if (result.factors && result.factors.length > 0) {
      log(`\n  ${c.bold}Risk Factors (${result.factorCount || result.factors.length}/${result.totalFactors || 8}):${c.reset}\n`)
      for (const f of result.factors) {
        log(`    ${c.yellow}+${f.points}pts${c.reset}  ${f.label}`)
      }
    } else {
      log(`\n  ${c.green}No risk factors triggered.${c.reset}`)
    }

    if (result.agentReasoning) {
      log(`\n${c.dim}── AI Analysis ──${c.reset}\n`)
      log(`  ${result.agentReasoning}`)
    }

    if (result.walletData) {
      log(`\n${c.dim}── Wallet Data ──${c.reset}\n`)
      const w = result.walletData
      log(`  Balance:    ${w.balance ?? 'N/A'} FLOW`)
      log(`  Keys:       ${w.keyCount ?? 'N/A'}`)
      log(`  Txns:       ${w.sequenceNumber ?? 'N/A'}`)
      log(`  Contracts:  ${w.contractCount ?? 'N/A'}`)
    }
    log('')
  } catch (err) {
    stop()
    error(`Risk check failed: ${err.message}`)
    process.exit(1)
  }
}

// flowshield monitor <address>
async function cmdMonitor(address) {
  if (!address || !isFlowAddress(address)) {
    error('Usage: flowshield monitor <0xAddress>')
    error('Address must be 0x + 16 hex characters')
    process.exit(1)
  }

  banner()
  const stop = spinner(`Monitoring ${address} for anomalies...`)

  try {
    const result = await apiFetch('/api/risk/monitor', {
      method: 'POST',
      body: JSON.stringify({ address }),
    })

    stop()

    log(`\n${c.bold}── Anomaly Monitor ──${c.reset}\n`)

    const sevColor = result.highestSeverity === 'high' ? c.red
      : result.highestSeverity === 'medium' ? c.yellow
      : result.highestSeverity === 'low' ? c.cyan
      : c.green

    log(`  Address:     ${c.cyan}${address}${c.reset}`)
    log(`  Anomalies:   ${sevColor}${c.bold}${result.anomalyCount || 0}${c.reset}`)
    log(`  Severity:    ${sevColor}${result.highestSeverity || 'none'}${c.reset}`)
    log(`  Action:      ${c.bold}${result.recommendedAction || 'none'}${c.reset}`)
    log(`  Source:      ${c.dim}${result.analysisSource || 'checklist'}${c.reset}`)
    log(`  Summary:     ${result.summary || 'No issues detected'}`)

    if (result.anomalies && result.anomalies.length > 0) {
      log(`\n  ${c.bold}Detected Anomalies:${c.reset}\n`)
      for (const a of result.anomalies) {
        const aColor = a.severity === 'high' ? c.red : a.severity === 'medium' ? c.yellow : c.cyan
        log(`  ${aColor}[${a.severity}]${c.reset} ${a.label}`)
        if (a.detail) log(`    ${c.dim}${a.detail}${c.reset}`)
        log('')
      }
    }

    if (result.agentReasoning) {
      log(`${c.dim}── AI Analysis ──${c.reset}\n`)
      log(`  ${result.agentReasoning}\n`)
    }
  } catch (err) {
    stop()
    error(`Monitor failed: ${err.message}`)
    process.exit(1)
  }
}

// flowshield compliance
async function cmdCompliance() {
  banner()
  const stop = spinner('Running regulatory compliance scan across all jurisdictions...')

  try {
    const result = await apiFetch('/api/copilot/radar/scan', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    stop()

    log(`\n${c.bold}── Regulatory Compliance Scan ──${c.reset}\n`)
    log(`  Source:     ${c.dim}${result.source || 'compliance-checklist'}${c.reset}`)
    log(`  Scanned:   ${c.dim}${result.scannedAt || new Date().toISOString()}${c.reset}`)

    if (result.compliantJurisdictions && result.compliantJurisdictions.length > 0) {
      log(`  Compliant: ${c.green}${result.compliantJurisdictions.join(', ')}${c.reset}`)
    }

    if (result.gaps && result.gaps.length > 0) {
      log(`\n  ${c.bold}Compliance Gaps: ${result.gaps.length}${c.reset}\n`)
      for (const gap of result.gaps) {
        const gColor = gap.severity === 'high' ? c.red : gap.severity === 'medium' ? c.yellow : c.cyan
        log(`  ${gColor}[${gap.severity}]${c.reset} ${c.bold}${gap.title}${c.reset}`)
        log(`    ${c.dim}Jurisdiction: ${gap.jurisdiction}${c.reset}`)
        if (gap.summary) log(`    ${gap.summary}`)
        if (gap.regulatoryBasis) log(`    ${c.dim}Basis: ${gap.regulatoryBasis}${c.reset}`)
        log('')
      }
    } else {
      log(`\n  ${c.green}No compliance gaps detected.${c.reset}\n`)
    }

    if (result.overallAssessment) {
      log(`${c.dim}── Overall Assessment ──${c.reset}\n`)
      log(`  ${result.overallAssessment}\n`)
    }
  } catch (err) {
    stop()
    error(`Compliance scan failed: ${err.message}`)
    process.exit(1)
  }
}

// flowshield verify <address>
async function cmdVerify(address) {
  if (!address || !isFlowAddress(address)) {
    error('Usage: flowshield verify <0xAddress>')
    process.exit(1)
  }

  banner()
  const stop = spinner(`Checking credential for ${address}...`)

  try {
    const result = await apiFetch(`/api/risk/score`, {
      method: 'POST',
      body: JSON.stringify({ address }),
    })

    stop()

    log(`\n${c.bold}── Credential Verification ──${c.reset}\n`)

    const tier = result.tier || 'unknown'
    const tierColor = tier === 'compliant' ? c.green
      : tier === 'semi-compliant' ? c.yellow
      : c.red

    log(`  Address:  ${c.cyan}${address}${c.reset}`)
    log(`  Tier:     ${tierColor}${c.bold}${tier}${c.reset}`)
    log(`  Score:    ${result.score}/100`)

    const wouldPass = result.tier === 'compliant' || result.tier === 'semi-compliant'
    log(`\n  ComplianceAction.verify():     ${wouldPass ? `${c.green}PASS` : `${c.red}FAIL`}${c.reset}`)
    log(`  ComplianceAction.verifyFull(): ${result.tier === 'compliant' ? `${c.green}PASS` : `${c.red}FAIL`}${c.reset}`)
    log('')
  } catch (err) {
    stop()
    error(`Verify failed: ${err.message}`)
    process.exit(1)
  }
}

// flowshield status
async function cmdStatus() {
  banner()
  const stop = spinner('Checking FlowShield API status...')

  try {
    const [health, pool] = await Promise.all([
      apiFetch('/health').catch(() => null),
      apiFetch('/api/pool/status').catch(() => null),
    ])

    stop()

    log(`\n${c.bold}── FlowShield Status ──${c.reset}\n`)
    log(`  API URL:  ${c.cyan}${getApiUrl()}${c.reset}`)

    if (health) {
      log(`  Status:   ${c.green}${c.bold}ONLINE${c.reset}`)
      log(`  Version:  ${c.dim}${health.version || 'unknown'}${c.reset}`)
      log(`  Network:  ${c.dim}${health.network || 'testnet'}${c.reset}`)
      if (health.contract) log(`  Contract: ${c.dim}${health.contract}${c.reset}`)
    } else {
      log(`  Status:   ${c.red}${c.bold}OFFLINE${c.reset}`)
    }

    if (pool) {
      log(`\n${c.bold}── DeFi Pool Stats ──${c.reset}\n`)
      log(`  Total Deposits:  ${c.green}${pool.totalDeposits ?? 'N/A'} FLOW${c.reset}`)
      log(`  Total Borrowed:  ${c.yellow}${pool.totalBorrowed ?? 'N/A'} FLOW${c.reset}`)
      log(`  Liquidity:       ${pool.availableLiquidity ?? 'N/A'} FLOW`)
      log(`  Utilization:     ${((pool.utilizationRate ?? 0) * 100).toFixed(1)}%`)
      log(`  Supply APY:      ${pool.baseAPYPercent ?? 'N/A'}%`)
      log(`  Borrow Rate:     ${pool.borrowRatePercent ?? 'N/A'}%`)
      log(`  Max LTV:         ${pool.maxLTVPercent ?? 'N/A'}%`)
      log(`  Transactions:    ${pool.totalTransactions ?? 'N/A'}`)
    }

    log('')
  } catch (err) {
    stop()
    error(`Status check failed: ${err.message}`)
    process.exit(1)
  }
}

// flowshield login <email>
async function cmdLogin(email) {
  if (!email) {
    error('Usage: flowshield login <email>')
    process.exit(1)
  }

  banner()
  const stop = spinner(`Logging in as ${email}...`)

  try {
    const result = await apiFetch('/api/accounts/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })

    stop()

    success(`Logged in as ${c.bold}${email}${c.reset}\n`)
    log(`  Address: ${c.cyan}${result.address}${c.reset}`)
    log(`  Token:   ${c.dim}${result.token}${c.reset}`)
    log(``)
    log(`  ${c.bold}To use authenticated commands, set:${c.reset}`)
    log(``)
    log(`  ${c.yellow}export FLOWSHIELD_TOKEN=${result.token}${c.reset}`)
    log(``)
    log(`  Then run: ${c.cyan}flowshield scan <file>${c.reset}`)
    log(``)
  } catch (err) {
    stop()
    if (err.message.includes('No account found')) {
      error(`No account found for ${email}. Create one at https://flowshield.xyz`)
    } else {
      error(`Login failed: ${err.message}`)
    }
    process.exit(1)
  }
}

// flowshield help
function cmdHelp() {
  banner()
  log(`${c.bold}Usage:${c.reset} flowshield <command> [options]\n`)
  log(`${c.bold}Commands:${c.reset}\n`)
  log(`  ${c.cyan}init${c.reset}                     Generate FlowShield Cadence integration code`)
  log(`  ${c.cyan}login${c.reset} <email>             Log in and get a session token`)
  log(`  ${c.cyan}scan${c.reset}  <file>              Scan a Cadence/Solidity file for compliance issues`)
  log(`  ${c.cyan}risk${c.reset}  <0xAddress>         Check risk score for a Flow wallet`)
  log(`  ${c.cyan}monitor${c.reset} <0xAddress>       Detect behavioral anomalies for a wallet`)
  log(`  ${c.cyan}compliance${c.reset}                Run regulatory compliance scan (all jurisdictions)`)
  log(`  ${c.cyan}verify${c.reset} <0xAddress>        Check if address would pass ComplianceAction.verify()`)
  log(`  ${c.cyan}status${c.reset}                    Check API health and pool stats`)
  log(`  ${c.cyan}help${c.reset}                      Show this help message`)
  log(``)
  log(`${c.bold}Environment Variables:${c.reset}\n`)
  log(`  ${c.yellow}FLOWSHIELD_API${c.reset}          API base URL (default: ${DEFAULT_API})`)
  log(`  ${c.yellow}FLOWSHIELD_API_KEY${c.reset}      API key for authenticated endpoints`)
  log(`  ${c.yellow}FLOWSHIELD_TOKEN${c.reset}        Bearer token for user-authenticated endpoints (scan, compliance)`)
  log(``)
  log(`${c.bold}Examples:${c.reset}\n`)
  log(`  ${c.dim}$${c.reset} flowshield init`)
  log(`  ${c.dim}$${c.reset} flowshield scan ./contracts/LendingPool.cdc`)
  log(`  ${c.dim}$${c.reset} flowshield risk 0x93c691a98b975493`)
  log(`  ${c.dim}$${c.reset} flowshield monitor 0x93c691a98b975493`)
  log(`  ${c.dim}$${c.reset} flowshield compliance`)
  log(`  ${c.dim}$${c.reset} FLOWSHIELD_API=http://localhost:3001 flowshield status`)
  log(``)
  log(`${c.bold}Contract Address:${c.reset} ${c.cyan}${CONTRACT_ADDRESS}${c.reset} (Flow Testnet)`)
  log(`${c.bold}Documentation:${c.reset}    ${c.cyan}https://flowshield.xyz/docs${c.reset}`)
  log(``)
}

// ── Main ────────────────────────────────────────────────────────────────────

const [,, command, ...args] = process.argv

switch (command) {
  case 'init':
    cmdInit()
    break
  case 'login':
    cmdLogin(args[0])
    break
  case 'scan':
    cmdScan(args[0])
    break
  case 'risk':
    cmdRisk(args[0])
    break
  case 'monitor':
    cmdMonitor(args[0])
    break
  case 'compliance':
    cmdCompliance()
    break
  case 'verify':
    cmdVerify(args[0])
    break
  case 'status':
    cmdStatus()
    break
  case 'help':
  case '--help':
  case '-h':
    cmdHelp()
    break
  case undefined:
    cmdHelp()
    break
  default:
    error(`Unknown command: ${command}`)
    log(`Run ${c.bold}flowshield help${c.reset} for usage.\n`)
    process.exit(1)
}

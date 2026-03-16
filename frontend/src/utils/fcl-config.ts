/**
 * @file FCL Configuration
 * @module utils/fcl-config
 * @description Flow Client Library (FCL) setup for wallet connections.
 *              Configures Flow testnet access node, wallet discovery, and app metadata.
 */
// Supports:
//   - Lilico Wallet (Flow native)
//   - Blocto Wallet
//   - Dapper Wallet
//   - Flow Wallet Discovery (any compatible wallet)
//
// For production: users connect their real Flow wallet, FlowShield checks
// their on-chain compliance credential, and the protocol interacts directly.

import * as fcl from '@onflow/fcl'

const FLOW_NETWORK = import.meta.env.VITE_FLOW_NETWORK || 'testnet'
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x93c691a98b975493'

// ── Configure FCL ──
fcl.config()
  .put('app.detail.title', 'FlowShield')
  .put('app.detail.icon', 'https://flowshield.xyz/flowshield_logo.png')
  .put('flow.network', FLOW_NETWORK)
  .put('accessNode.api',
    FLOW_NETWORK === 'testnet'
      ? 'https://rest-testnet.onflow.org'
      : FLOW_NETWORK === 'mainnet'
        ? 'https://rest-mainnet.onflow.org'
        : 'http://localhost:8888'
  )
  .put('discovery.wallet',
    FLOW_NETWORK === 'testnet'
      ? 'https://fcl-discovery.onflow.org/testnet/authn'
      : FLOW_NETWORK === 'mainnet'
        ? 'https://fcl-discovery.onflow.org/authn'
        : 'http://localhost:8701/fcl/authn'
  )
  // Contract aliases
  .put('0xComplianceCredential', CONTRACT_ADDRESS)
  .put('0xComplianceAction', CONTRACT_ADDRESS)
  .put('0xZKVerifier', CONTRACT_ADDRESS)
  .put('0xRuleEngine', CONTRACT_ADDRESS)
  .put('0xDemoLendingPool', CONTRACT_ADDRESS)
  .put('0xComplianceAgent', CONTRACT_ADDRESS)
  .put('0xGovernance', CONTRACT_ADDRESS)
  // Flow system contracts (testnet)
  .put('0xFungibleToken', '0x9a0766d93b6608b7')
  .put('0xFlowToken', '0x7e60df042a9c0868')
  .put('0xEVM', '0xe467b9dd11fa00df')

// ── Wallet Connection ──

/**
 * Connect user's Flow wallet via FCL Discovery.
 * Opens a popup with available wallets (Lilico, Blocto, etc.)
 * @returns {Object} { addr, loggedIn, ... }
 */
export async function connectWallet() {
  await fcl.authenticate()
  return fcl.currentUser.snapshot()
}

/**
 * Disconnect the wallet
 */
export async function disconnectWallet() {
  await fcl.unauthenticate()
}

/**
 * Subscribe to wallet connection changes
 * @param {Function} callback - Called with user object on auth state change
 * @returns {Function} unsubscribe function
 */
export function subscribeToWallet(callback) {
  return fcl.currentUser.subscribe(callback)
}

/**
 * Get current connected user
 * @returns {Object|null}
 */
export async function getCurrentUser() {
  const user = await fcl.currentUser.snapshot()
  return user.loggedIn ? user : null
}

// ── On-Chain Queries ──

/**
 * Check if a connected wallet has a valid compliance credential
 * @param {string} address - Flow address
 * @returns {Object} { isCompliant, tier, riskScore, jurisdiction, expiresAt }
 */
export async function checkCompliance(address) {
  try {
    const result = await fcl.query({
      cadence: `
        import ComplianceCredential from ${CONTRACT_ADDRESS}

        access(all) fun main(address: Address): {String: AnyStruct} {
          let account = getAccount(address)
          let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.PublicPath
          )

          if credRef == nil {
            return {
              "isCompliant": false,
              "hasCredential": false
            }
          }

          let cred = credRef!
          return {
            "isCompliant": cred.isValid(),
            "hasCredential": true,
            "tier": cred.getTier().rawValue,
            "riskScore": cred.getRiskScore(),
            "jurisdiction": cred.getJurisdiction(),
            "expiresAt": cred.getExpiresAt(),
            "issuedAt": cred.getIssuedAt(),
            "proofHash": cred.getProofHash()
          }
        }
      `,
      args: (arg, t) => [arg(address, t.Address)],
    })
    return result
  } catch (err) {
    console.error('[FCL] Compliance check failed:', err)
    return { isCompliant: false, hasCredential: false, error: err.message }
  }
}

/**
 * Query on-chain jurisdiction rules from RuleEngine
 * @param {string} jurisdiction - US, EU, UK, SG, CA
 */
export async function getJurisdictionRules(jurisdiction) {
  try {
    return await fcl.query({
      cadence: `
        import RuleEngine from ${CONTRACT_ADDRESS}

        access(all) fun main(jurisdiction: String): {String: UFix64}? {
          return RuleEngine.getRules(jurisdiction: jurisdiction)
        }
      `,
      args: (arg, t) => [arg(jurisdiction, t.String)],
    })
  } catch (err) {
    console.error('[FCL] Rule query failed:', err)
    return null
  }
}

/**
 * Get fee schedule from ComplianceAction
 */
export async function getFeeSchedule() {
  try {
    return await fcl.query({
      cadence: `
        import ComplianceAction from ${CONTRACT_ADDRESS}

        access(all) fun main(): {String: UFix64} {
          return ComplianceAction.getFeeSchedule()
        }
      `,
    })
  } catch (err) {
    console.error('[FCL] Fee schedule query failed:', err)
    return { verificationFee: '0.001', credentialIssuanceFee: '0.01', totalCollected: '0.0' }
  }
}

/**
 * Send a paid verification transaction
 * Protocol pays the fee, verification result returned on-chain
 * @param {string} userAddress - Address to verify
 */
export async function verifyWithFee(userAddress) {
  try {
    const txId = await fcl.mutate({
      cadence: `
        import ComplianceAction from ${CONTRACT_ADDRESS}
        import FlowToken from 0x7e60df042a9c0868
        import FungibleToken from 0x9a0766d93b6608b7

        transaction(userAddress: Address) {
          let payment: @{FungibleToken.Vault}

          prepare(payer: auth(Storage) &Account) {
            let vault = payer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
              from: /storage/flowTokenVault
            ) ?? panic("No FLOW vault")

            self.payment <- vault.withdraw(amount: ComplianceAction.verificationFee)
          }

          execute {
            let result = ComplianceAction.verifyWithFee(userAddress, payment: <- self.payment)
            log("Verification result: ".concat(result ? "COMPLIANT" : "NOT COMPLIANT"))
          }
        }
      `,
      args: (arg, t) => [arg(userAddress, t.Address)],
      limit: 100,
    })

    const txResult = await fcl.tx(txId).onceSealed()
    return { success: true, txId, status: txResult.status }
  } catch (err) {
    console.error('[FCL] Paid verification failed:', err)
    return { success: false, error: err.message }
  }
}

export { fcl, CONTRACT_ADDRESS, FLOW_NETWORK }

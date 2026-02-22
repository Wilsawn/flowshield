// useCompliance.js
// React hook to check compliance status from Flow blockchain.
//
// What to implement:
// - useCompliance(address) -> { isValid, tier, riskScore, expiresAt, loading, error }
// - Use @onflow/fcl to run the check_compliance.cdc script
// - Auto-refresh on interval or on-demand

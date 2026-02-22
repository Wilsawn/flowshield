// ComplianceCredential.cdc
// Core credential resource that lives in a user's account.
//
// What to implement:
// - ComplianceTier enum (compliant, semiCompliant, nonCompliant)
// - CredentialPublic interface (isValid, getTier, getExpiresAt, getRiskScore, isExpired)
// - Credential resource with tier, riskScore, expiresAt, revoked status, proofHash
// - Admin resource that can mint, revoke, and update credentials
// - Storage and public paths for capability-based access
// - Events for minting, revoking, expiring

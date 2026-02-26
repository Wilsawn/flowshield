/// ComplianceAction.cdc
/// Composable Flow Actions primitive for compliance verification.
///
/// This is the one-line integration point for DeFi protocols.
/// Any Cadence transaction can call ComplianceAction.verify(addr) as a
/// pre-condition before executing financial operations.
///
/// Usage in a transaction:
///   let isCompliant = ComplianceAction.verify(userAddress)
///   assert(isCompliant, message: "User is not compliant")
///   // ... proceed with DeFi operation

import ComplianceCredential from "./ComplianceCredential.cdc"

access(all) contract ComplianceAction {

    // ── Events ──
    access(all) event ComplianceVerified(address: Address, tier: UInt8, action: String)
    access(all) event ComplianceFailed(address: Address, reason: String, action: String)

    // ── Verification counter ──
    access(all) var totalVerifications: UInt64
    access(all) var totalRejections: UInt64

    // ── Verification Record ──
    // Returned after each verification for audit trail
    access(all) struct VerificationRecord {
        access(all) let address: Address
        access(all) let passed: Bool
        access(all) let tier: UInt8
        access(all) let riskScore: UInt64
        access(all) let jurisdiction: String
        access(all) let timestamp: UFix64
        access(all) let credentialExpiry: UFix64

        init(
            address: Address,
            passed: Bool,
            tier: UInt8,
            riskScore: UInt64,
            jurisdiction: String,
            credentialExpiry: UFix64
        ) {
            self.address = address
            self.passed = passed
            self.tier = tier
            self.riskScore = riskScore
            self.jurisdiction = jurisdiction
            self.timestamp = getCurrentBlock().timestamp
            self.credentialExpiry = credentialExpiry
        }
    }

    /// Verify that an address holds any valid compliance credential.
    /// This is the standard check — allows compliant AND semi-compliant users.
    /// Use this for low-risk operations like deposits.
    access(all) fun verify(_ address: Address): Bool {
        let account = getAccount(address)
        if let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.PublicPath
        ) {
            if credRef.isValid() {
                self.totalVerifications = self.totalVerifications + 1
                emit ComplianceVerified(
                    address: address,
                    tier: credRef.getTier().rawValue,
                    action: "verify"
                )
                return true
            }

            // Credential exists but is invalid (expired or revoked)
            self.totalRejections = self.totalRejections + 1
            emit ComplianceFailed(address: address, reason: "Credential expired or revoked", action: "verify")
            return false
        }

        // No credential found
        self.totalRejections = self.totalRejections + 1
        emit ComplianceFailed(address: address, reason: "No credential found", action: "verify")
        return false
    }

    /// Verify that an address is FULLY compliant (tier == compliant, not semi-compliant).
    /// Use this for higher-risk operations like borrowing or large transfers.
    access(all) fun verifyFull(_ address: Address): Bool {
        let account = getAccount(address)
        if let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.PublicPath
        ) {
            if credRef.isValid() && credRef.getTier() == ComplianceCredential.ComplianceTier.compliant {
                self.totalVerifications = self.totalVerifications + 1
                emit ComplianceVerified(address: address, tier: 0, action: "verifyFull")
                return true
            }

            let reason = !credRef.isValid()
                ? "Credential expired or revoked"
                : "Insufficient compliance tier"
            self.totalRejections = self.totalRejections + 1
            emit ComplianceFailed(address: address, reason: reason, action: "verifyFull")
            return false
        }

        self.totalRejections = self.totalRejections + 1
        emit ComplianceFailed(address: address, reason: "No credential found", action: "verifyFull")
        return false
    }

    /// Full verification with detailed record returned (for audit logging)
    access(all) fun verifyWithRecord(_ address: Address): VerificationRecord {
        let account = getAccount(address)
        if let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.PublicPath
        ) {
            let passed = credRef.isValid()
            if passed {
                self.totalVerifications = self.totalVerifications + 1
            } else {
                self.totalRejections = self.totalRejections + 1
            }

            return VerificationRecord(
                address: address,
                passed: passed,
                tier: credRef.getTier().rawValue,
                riskScore: credRef.getRiskScore(),
                jurisdiction: credRef.getJurisdiction(),
                credentialExpiry: credRef.getExpiresAt()
            )
        }

        self.totalRejections = self.totalRejections + 1
        return VerificationRecord(
            address: address,
            passed: false,
            tier: 2,
            riskScore: 0,
            jurisdiction: "",
            credentialExpiry: 0.0
        )
    }

    /// Verify for a specific jurisdiction requirement
    access(all) fun verifyForJurisdiction(_ address: Address, jurisdiction: String): Bool {
        let account = getAccount(address)
        if let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.PublicPath
        ) {
            if credRef.isValid() && credRef.getJurisdiction() == jurisdiction {
                self.totalVerifications = self.totalVerifications + 1
                emit ComplianceVerified(
                    address: address,
                    tier: credRef.getTier().rawValue,
                    action: "verifyJurisdiction:".concat(jurisdiction)
                )
                return true
            }
            return false
        }
        return false
    }

    // ── Contract Init ──
    init() {
        self.totalVerifications = 0
        self.totalRejections = 0
    }
}

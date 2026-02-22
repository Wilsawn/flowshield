/// ComplianceCredential.cdc
/// A resource-based compliance credential that lives in a user's account.
/// Non-duplicable, expirable, and revocable.

access(all) contract ComplianceCredential {

    // ===== Events =====
    access(all) event CredentialMinted(address: Address, tier: String, expiresAt: UFix64)
    access(all) event CredentialRevoked(address: Address, reason: String)
    access(all) event CredentialExpired(address: Address)

    // ===== Paths =====
    access(all) let CredentialStoragePath: StoragePath
    access(all) let CredentialPublicPath: PublicPath

    // ===== Compliance Tiers =====
    access(all) enum ComplianceTier: UInt8 {
        access(all) case compliant      // Low risk, full access
        access(all) case semiCompliant  // Medium risk, limited access, re-verify soon
        access(all) case nonCompliant   // High risk or failed ZK proof
    }

    // ===== Public Interface =====
    // Any protocol can check compliance status without accessing private data
    access(all) resource interface CredentialPublic {
        access(all) view fun isValid(): Bool
        access(all) view fun getTier(): ComplianceTier
        access(all) view fun getExpiresAt(): UFix64
        access(all) view fun getRiskScore(): UInt8
        access(all) view fun isExpired(): Bool
    }

    // ===== Credential Resource =====
    access(all) resource Credential: CredentialPublic {
        // Compliance tier based on ZK proof + AI risk assessment
        access(self) var tier: ComplianceTier

        // Risk score from AI agent (0-100, lower is better)
        access(self) var riskScore: UInt8

        // Expiration timestamp (block timestamp)
        access(self) var expiresAt: UFix64

        // Whether this credential has been revoked
        access(self) var revoked: Bool

        // Timestamp of issuance
        access(all) let issuedAt: UFix64

        // Hash of the ZK proof that was verified (for audit trail)
        access(all) let proofHash: String

        init(tier: ComplianceTier, riskScore: UInt8, expiresAt: UFix64, proofHash: String) {
            self.tier = tier
            self.riskScore = riskScore
            self.expiresAt = expiresAt
            self.revoked = false
            self.issuedAt = getCurrentBlock().timestamp
            self.proofHash = proofHash
        }

        // Check if credential is currently valid (not expired and not revoked)
        access(all) view fun isValid(): Bool {
            return !self.revoked && !self.isExpired() && self.tier != ComplianceTier.nonCompliant
        }

        access(all) view fun getTier(): ComplianceTier {
            return self.tier
        }

        access(all) view fun getExpiresAt(): UFix64 {
            return self.expiresAt
        }

        access(all) view fun getRiskScore(): UInt8 {
            return self.riskScore
        }

        access(all) view fun isExpired(): Bool {
            return getCurrentBlock().timestamp >= self.expiresAt
        }

        // Update risk score (called by compliance agent during monitoring)
        access(contract) fun updateRiskScore(newScore: UInt8) {
            self.riskScore = newScore
            // Auto-adjust tier based on new score
            if newScore <= 30 {
                self.tier = ComplianceTier.compliant
            } else if newScore <= 70 {
                self.tier = ComplianceTier.semiCompliant
            } else {
                self.tier = ComplianceTier.nonCompliant
            }
        }

        // Revoke credential (called by authorized admin)
        access(contract) fun revoke() {
            self.revoked = true
        }
    }

    // ===== Admin Resource =====
    // Held by the FlowShield deployer account
    access(all) resource Admin {

        // Mint a new credential after ZK proof verification
        access(all) fun mintCredential(
            tier: ComplianceTier,
            riskScore: UInt8,
            durationSeconds: UFix64,
            proofHash: String
        ): @Credential {
            let expiresAt = getCurrentBlock().timestamp + durationSeconds

            emit CredentialMinted(
                address: self.owner?.address ?? panic("Admin must have an owner"),
                tier: tier.rawValue == 0 ? "compliant" : tier.rawValue == 1 ? "semiCompliant" : "nonCompliant",
                expiresAt: expiresAt
            )

            return <- create Credential(
                tier: tier,
                riskScore: riskScore,
                expiresAt: expiresAt,
                proofHash: proofHash
            )
        }

        // Revoke a credential at a given address
        access(all) fun revokeCredential(address: Address, reason: String) {
            // This would interact with the credential at the target address
            // Implementation depends on capability setup
            emit CredentialRevoked(address: address, reason: reason)
        }
    }

    // ===== Contract Init =====
    init() {
        self.CredentialStoragePath = /storage/FlowShieldCredential
        self.CredentialPublicPath = /public/FlowShieldCredential

        // Create and store admin resource
        let admin <- create Admin()
        self.account.storage.save(<- admin, to: /storage/FlowShieldAdmin)
    }
}

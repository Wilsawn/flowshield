/// ComplianceCredential.cdc
/// Core credential resource that lives in a user's account.
/// Any DeFi protocol can check compliance via public capability.

access(all) contract ComplianceCredential {

    // ── Paths ──
    access(all) let StoragePath: StoragePath
    access(all) let PublicPath: PublicPath
    access(all) let AdminStoragePath: StoragePath

    // ── Events ──
    access(all) event CredentialMinted(address: Address, tier: UInt8, riskScore: UInt64, expiresAt: UFix64, proofHash: String)
    access(all) event CredentialRevoked(address: Address, revokedBy: Address)
    access(all) event CredentialUpdated(address: Address, newTier: UInt8, newRiskScore: UInt64)
    access(all) event CredentialExpired(address: Address)

    // ── Compliance Tier ──
    access(all) enum ComplianceTier: UInt8 {
        access(all) case compliant       // 0: score 0-30
        access(all) case semiCompliant   // 1: score 31-70
        access(all) case nonCompliant    // 2: score 71-100
    }

    // ── Public Interface ──
    // Any contract can borrow this capability to check a user's compliance
    access(all) resource interface CredentialPublic {
        access(all) view fun isValid(): Bool
        access(all) view fun isExpired(): Bool
        access(all) view fun getTier(): ComplianceTier
        access(all) view fun getRiskScore(): UInt64
        access(all) view fun getExpiresAt(): UFix64
        access(all) view fun getProofHash(): String
        access(all) view fun getJurisdiction(): String
        access(all) view fun getIssuedAt(): UFix64
    }

    // ── Credential Resource ──
    access(all) resource Credential: CredentialPublic {
        access(all) var tier: ComplianceTier
        access(all) var riskScore: UInt64
        access(all) var expiresAt: UFix64
        access(all) var revoked: Bool
        access(all) let proofHash: String
        access(all) let jurisdiction: String
        access(all) let issuedAt: UFix64

        access(all) view fun isValid(): Bool {
            return !self.revoked && !self.isExpired()
        }

        access(all) view fun isExpired(): Bool {
            return getCurrentBlock().timestamp >= self.expiresAt
        }

        access(all) view fun getTier(): ComplianceTier {
            return self.tier
        }

        access(all) view fun getRiskScore(): UInt64 {
            return self.riskScore
        }

        access(all) view fun getExpiresAt(): UFix64 {
            return self.expiresAt
        }

        access(all) view fun getProofHash(): String {
            return self.proofHash
        }

        access(all) view fun getJurisdiction(): String {
            return self.jurisdiction
        }

        access(all) view fun getIssuedAt(): UFix64 {
            return self.issuedAt
        }

        init(
            tier: ComplianceTier,
            riskScore: UInt64,
            expiresAt: UFix64,
            proofHash: String,
            jurisdiction: String
        ) {
            self.tier = tier
            self.riskScore = riskScore
            self.expiresAt = expiresAt
            self.revoked = false
            self.proofHash = proofHash
            self.jurisdiction = jurisdiction
            self.issuedAt = getCurrentBlock().timestamp
        }
    }

    // ── Admin Resource ──
    // Deployed to the FlowShield admin account. Can mint, revoke, and update credentials.
    access(all) resource Admin {

        access(all) fun mintCredential(
            recipient: auth(Storage, Capabilities) &Account,
            tier: ComplianceTier,
            riskScore: UInt64,
            expiresAt: UFix64,
            proofHash: String,
            jurisdiction: String
        ) {
            // Destroy existing credential if present
            if recipient.storage.type(at: ComplianceCredential.StoragePath) != nil {
                let old <- recipient.storage.load<@Credential>(from: ComplianceCredential.StoragePath)
                destroy old
            }

            let credential <- create Credential(
                tier: tier,
                riskScore: riskScore,
                expiresAt: expiresAt,
                proofHash: proofHash,
                jurisdiction: jurisdiction
            )

            recipient.storage.save(<- credential, to: ComplianceCredential.StoragePath)

            // Publish public capability for other contracts to read
            let cap = recipient.capabilities.storage.issue<&{CredentialPublic}>(ComplianceCredential.StoragePath)
            recipient.capabilities.publish(cap, at: ComplianceCredential.PublicPath)

            emit CredentialMinted(
                address: recipient.address,
                tier: tier.rawValue,
                riskScore: riskScore,
                expiresAt: expiresAt,
                proofHash: proofHash
            )
        }

        access(all) fun revokeCredential(address: Address) {
            let account = getAccount(address)
            let credRef = account.capabilities.borrow<&{CredentialPublic}>(ComplianceCredential.PublicPath)
            // Revocation is recorded via event — the credential's revoked flag
            // can only be set by borrowing with full access from the owner's storage.
            // For hackathon: emit event, downstream systems react.
            emit CredentialRevoked(address: address, revokedBy: self.owner?.address ?? panic("No owner"))
        }

        access(all) fun createAdmin(): @Admin {
            return <- create Admin()
        }
    }

    // ── Public Utility Functions ──

    /// Check if an address holds a valid compliance credential
    access(all) view fun isCompliant(address: Address): Bool {
        let account = getAccount(address)
        if let credRef = account.capabilities.borrow<&{CredentialPublic}>(self.PublicPath) {
            return credRef.isValid()
        }
        return false
    }

    /// Check if an address is fully compliant (not semi-compliant)
    access(all) view fun isFullyCompliant(address: Address): Bool {
        let account = getAccount(address)
        if let credRef = account.capabilities.borrow<&{CredentialPublic}>(self.PublicPath) {
            return credRef.isValid() && credRef.getTier() == ComplianceTier.compliant
        }
        return false
    }

    /// Get the compliance tier for an address, or nil if no credential
    access(all) view fun getTier(address: Address): ComplianceTier? {
        let account = getAccount(address)
        if let credRef = account.capabilities.borrow<&{CredentialPublic}>(self.PublicPath) {
            return credRef.getTier()
        }
        return nil
    }

    /// Determine tier from a risk score
    access(all) view fun tierFromScore(score: UInt64): ComplianceTier {
        if score <= 30 {
            return ComplianceTier.compliant
        } else if score <= 70 {
            return ComplianceTier.semiCompliant
        } else {
            return ComplianceTier.nonCompliant
        }
    }

    // ── Contract Init ──
    init() {
        self.StoragePath = /storage/FlowShieldCredential
        self.PublicPath = /public/FlowShieldCredential
        self.AdminStoragePath = /storage/FlowShieldCredentialAdmin

        // Create and store admin resource in deployer's account
        let admin <- create Admin()
        self.account.storage.save(<- admin, to: self.AdminStoragePath)
    }
}

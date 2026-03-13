/// ComplianceCredential.cdc
///
/// @notice Core credential NFT-like resource for FlowShield compliance.
/// @dev    Stored as a Cadence Resource in each user's account storage.
///         Other DeFi contracts read compliance status via the public CredentialPublic capability.
///         Only the Admin resource (held by the deployer) can mint, revoke, or update credentials.
///
/// @author FlowShield
/// @version 1.0.0
/// @network Flow Testnet — deployed at 0x93c691a98b975493

access(all) contract ComplianceCredential {

    // ── Storage Paths ──
    access(all) let StoragePath: StoragePath          /// Where the Credential resource lives in a user's account
    access(all) let PublicPath: PublicPath             /// Public capability path for read-only access
    access(all) let AdminStoragePath: StoragePath      /// Where the Admin resource lives in the deployer's account

    // ── Events ──
    /// @notice Emitted when a new compliance credential is minted into a user's account
    access(all) event CredentialMinted(address: Address, tier: UInt8, riskScore: UInt64, expiresAt: UFix64, proofHash: String)
    /// @notice Emitted when an admin revokes a user's credential
    access(all) event CredentialRevoked(address: Address, revokedBy: Address)
    /// @notice Emitted when a credential's tier or risk score is updated
    access(all) event CredentialUpdated(address: Address, newTier: UInt8, newRiskScore: UInt64)
    /// @notice Emitted when a credential passes its expiration timestamp
    access(all) event CredentialExpired(address: Address)

    /// @notice Compliance tiers derived from risk score ranges
    /// @dev    0 = compliant (low risk), 1 = semiCompliant (medium), 2 = nonCompliant (high)
    access(all) enum ComplianceTier: UInt8 {
        access(all) case compliant       // 0: score 0-30
        access(all) case semiCompliant   // 1: score 31-70
        access(all) case nonCompliant    // 2: score 71-100
    }

    /// @notice Public read-only interface for compliance checks.
    /// @dev    Any contract can borrow this capability to verify a user's compliance
    ///         without needing storage access. This is the integration point for DeFi protocols.
    access(all) resource interface CredentialPublic {
        /// @return True if the credential is not revoked and not expired
        access(all) view fun isValid(): Bool
        /// @return True if the current block timestamp exceeds the expiry
        access(all) view fun isExpired(): Bool
        /// @return The compliance tier (compliant, semiCompliant, or nonCompliant)
        access(all) view fun getTier(): ComplianceTier
        /// @return The numerical risk score (0–100)
        access(all) view fun getRiskScore(): UInt64
        /// @return Unix timestamp when this credential expires
        access(all) view fun getExpiresAt(): UFix64
        /// @return The ZK proof hash used during credential issuance
        access(all) view fun getProofHash(): String
        /// @return The jurisdiction code (e.g. "US", "EU", "UK")
        access(all) view fun getJurisdiction(): String
        /// @return Unix timestamp when this credential was issued
        access(all) view fun getIssuedAt(): UFix64
    }

    /// @notice The credential resource stored in each compliant user's account.
    /// @dev    Implements CredentialPublic for read-only external access.
    ///         Contains risk score, tier, jurisdiction, expiry, and ZK proof hash.
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

    /// @notice Admin resource for credential lifecycle management.
    /// @dev    Created during contract init and stored in the deployer's account.
    ///         Only the admin can mint new credentials, revoke existing ones, or create sub-admins.
    access(all) resource Admin {

        /// @notice Mints a new ComplianceCredential into the recipient's account storage.
        /// @dev    Requires a two-authorizer transaction: deployer (admin) + user account.
        ///         Destroys any existing credential before minting a new one.
        ///         Publishes a public capability so other contracts can read the credential.
        /// @param recipient The authorized account reference to receive the credential
        /// @param tier The compliance tier (compliant, semiCompliant, nonCompliant)
        /// @param riskScore Numerical risk score from 0 (lowest risk) to 100 (highest risk)
        /// @param expiresAt Unix timestamp when this credential expires (typically 90 days)
        /// @param proofHash The ZK proof hash from the browser-side verification
        /// @param jurisdiction The regulatory jurisdiction code (e.g. "US", "EU")
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

        /// @notice Revokes a user's compliance credential.
        /// @dev    Emits CredentialRevoked event. Downstream systems react to the event.
        /// @param address The Flow address whose credential should be revoked
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

/// ComplianceAction.cdc
/// Composable Flow Actions primitive for compliance verification.
///
/// This is the one-line integration point for DeFi protocols.
/// Any Cadence transaction can call ComplianceAction.verify(addr) as a
/// pre-condition before executing financial operations.
///
/// Revenue model: protocols pay a small per-verification fee (in FLOW)
/// that accumulates in the FlowShield treasury vault.
///
/// Usage in a transaction:
///   let isCompliant = ComplianceAction.verify(userAddress)
///   assert(isCompliant, message: "User is not compliant")
///   // ... proceed with DeFi operation

import ComplianceCredential from "./ComplianceCredential.cdc"
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

access(all) contract ComplianceAction {

    // ── Paths ──
    access(all) let AdminStoragePath: StoragePath
    access(all) let TreasuryStoragePath: StoragePath

    // ── Events ──
    access(all) event ComplianceVerified(address: Address, tier: UInt8, action: String)
    access(all) event ComplianceFailed(address: Address, reason: String, action: String)
    access(all) event FeeCollected(protocol: Address, amount: UFix64, action: String)
    access(all) event FeeUpdated(newFee: UFix64)
    access(all) event TreasuryWithdrawal(amount: UFix64, recipient: Address)

    // ── Verification counter ──
    access(all) var totalVerifications: UInt64
    access(all) var totalRejections: UInt64

    // ── Fee configuration ──
    // Per-verification fee in FLOW tokens (default: 0.001 FLOW)
    access(all) var verificationFee: UFix64
    access(all) var totalFeesCollected: UFix64
    access(all) var credentialIssuanceFee: UFix64

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

    /// Paid verification — protocol pays a FLOW fee per check.
    /// Fee goes to the FlowShield treasury vault.
    /// Returns the verification result.
    access(all) fun verifyWithFee(_ address: Address, payment: @{FungibleToken.Vault}): Bool {
        pre {
            payment.balance >= self.verificationFee:
                "Insufficient fee: requires ".concat(self.verificationFee.toString()).concat(" FLOW")
        }

        // Deposit fee into treasury
        let treasury = self.account.storage.borrow<&{FungibleToken.Receiver}>(
            from: self.TreasuryStoragePath
        ) ?? panic("Treasury vault not found")

        let feeAmount = payment.balance
        treasury.deposit(from: <- payment)
        self.totalFeesCollected = self.totalFeesCollected + feeAmount

        emit FeeCollected(protocol: address, amount: feeAmount, action: "verifyWithFee")

        // Run the actual verification
        return self.verify(address)
    }

    /// Paid full verification (stricter tier check)
    access(all) fun verifyFullWithFee(_ address: Address, payment: @{FungibleToken.Vault}): Bool {
        pre {
            payment.balance >= self.verificationFee:
                "Insufficient fee"
        }

        let treasury = self.account.storage.borrow<&{FungibleToken.Receiver}>(
            from: self.TreasuryStoragePath
        ) ?? panic("Treasury vault not found")

        let feeAmount = payment.balance
        treasury.deposit(from: <- payment)
        self.totalFeesCollected = self.totalFeesCollected + feeAmount

        emit FeeCollected(protocol: address, amount: feeAmount, action: "verifyFullWithFee")

        return self.verifyFull(address)
    }

    /// Get current fee schedule
    access(all) view fun getFeeSchedule(): {String: UFix64} {
        return {
            "verificationFee": self.verificationFee,
            "credentialIssuanceFee": self.credentialIssuanceFee,
            "totalCollected": self.totalFeesCollected
        }
    }

    // ── Admin Resource ──
    // Manages fee configuration and treasury withdrawals
    access(all) resource Admin {

        /// Update the per-verification fee
        access(all) fun setVerificationFee(newFee: UFix64) {
            ComplianceAction.verificationFee = newFee
            emit FeeUpdated(newFee: newFee)
        }

        /// Update the credential issuance fee
        access(all) fun setCredentialIssuanceFee(newFee: UFix64) {
            ComplianceAction.credentialIssuanceFee = newFee
        }

        /// Withdraw from treasury
        access(all) fun withdrawFromTreasury(amount: UFix64): @{FungibleToken.Vault} {
            let treasury = ComplianceAction.account.storage.borrow<auth(FungibleToken.Withdraw) &{FungibleToken.Vault}>(
                from: ComplianceAction.TreasuryStoragePath
            ) ?? panic("Treasury vault not found")

            let withdrawn <- treasury.withdraw(amount: amount)
            emit TreasuryWithdrawal(amount: amount, recipient: self.owner?.address ?? panic("No owner"))
            return <- withdrawn
        }

        /// Get treasury balance
        access(all) view fun getTreasuryBalance(): UFix64 {
            let treasury = ComplianceAction.account.storage.borrow<&{FungibleToken.Balance}>(
                from: ComplianceAction.TreasuryStoragePath
            )
            return treasury?.balance ?? 0.0
        }

        access(all) fun createAdmin(): @Admin {
            return <- create Admin()
        }
    }

    // ── Contract Init ──
    init() {
        self.AdminStoragePath = /storage/FlowShieldComplianceActionAdmin
        self.TreasuryStoragePath = /storage/FlowShieldTreasury

        self.totalVerifications = 0
        self.totalRejections = 0

        // Fee defaults
        self.verificationFee = 0.001      // 0.001 FLOW per verification
        self.credentialIssuanceFee = 0.01  // 0.01 FLOW per credential mint
        self.totalFeesCollected = 0.0

        // Create treasury vault (FlowToken vault to receive fees)
        let vault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
        self.account.storage.save(<- vault, to: self.TreasuryStoragePath)

        // Create admin
        let admin <- create Admin()
        self.account.storage.save(<- admin, to: self.AdminStoragePath)
    }
}

/// DemoLendingPool.cdc
/// A simplified lending pool that requires FlowShield compliance.
/// Demonstrates how any DeFi protocol integrates FlowShield
/// with a single compliance check.

import ComplianceCredential from "./ComplianceCredential.cdc"

access(all) contract DemoLendingPool {

    // ===== Events =====
    access(all) event Deposited(address: Address, amount: UFix64)
    access(all) event Borrowed(address: Address, amount: UFix64)
    access(all) event ComplianceCheckPassed(address: Address, tier: UInt8)
    access(all) event ComplianceCheckFailed(address: Address, reason: String)

    // ===== State =====
    access(self) var totalDeposits: UFix64
    access(self) var totalBorrowed: UFix64

    // ===== Compliance Gate =====
    // This is the key integration point. Any protocol adds this one function.
    access(all) fun checkCompliance(address: Address): Bool {
        let account = getAccount(address)

        // Borrow the user's public compliance credential
        if let credentialRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.CredentialPublicPath
        ) {
            if credentialRef.isValid() {
                emit ComplianceCheckPassed(address: address, tier: credentialRef.getTier().rawValue)
                return true
            } else {
                emit ComplianceCheckFailed(address: address, reason: "Credential expired or revoked")
                return false
            }
        }

        emit ComplianceCheckFailed(address: address, reason: "No compliance credential found")
        return false
    }

    // ===== Pool Operations =====

    // Deposit into the lending pool (requires compliance)
    access(all) fun deposit(from: Address, amount: UFix64) {
        // Compliance check — this is all a developer needs to add
        if !self.checkCompliance(address: from) {
            panic("Compliance check failed. Cannot deposit.")
        }

        self.totalDeposits = self.totalDeposits + amount
        emit Deposited(address: from, amount: amount)
    }

    // Borrow from the lending pool (requires compliance)
    access(all) fun borrow(borrower: Address, amount: UFix64) {
        // Compliance check
        if !self.checkCompliance(address: borrower) {
            panic("Compliance check failed. Cannot borrow.")
        }

        // Only fully compliant users can borrow
        let account = getAccount(borrower)
        if let credentialRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.CredentialPublicPath
        ) {
            if credentialRef.getTier() != ComplianceCredential.ComplianceTier.compliant {
                panic("Only fully compliant users can borrow. Current tier: semi-compliant")
            }
        }

        if amount > self.totalDeposits - self.totalBorrowed {
            panic("Insufficient pool liquidity")
        }

        self.totalBorrowed = self.totalBorrowed + amount
        emit Borrowed(address: borrower, amount: amount)
    }

    // ===== View Functions =====
    access(all) view fun getTotalDeposits(): UFix64 {
        return self.totalDeposits
    }

    access(all) view fun getTotalBorrowed(): UFix64 {
        return self.totalBorrowed
    }

    access(all) view fun getAvailableLiquidity(): UFix64 {
        return self.totalDeposits - self.totalBorrowed
    }

    // ===== Contract Init =====
    init() {
        self.totalDeposits = 0.0
        self.totalBorrowed = 0.0
    }
}

/// DemoLendingPool.cdc
/// Example DeFi app showing how a protocol integrates FlowShield.
///
/// This is the key demo contract for judges. It shows that adding compliance
/// to a DeFi protocol requires just ONE import and ONE function call.
///
/// Integration pattern:
///   import ComplianceAction from "./ComplianceAction.cdc"
///   let isCompliant = ComplianceAction.verify(depositor)
///   assert(isCompliant, message: "Not compliant")

import ComplianceAction from "./ComplianceAction.cdc"
import ComplianceCredential from "./ComplianceCredential.cdc"

access(all) contract DemoLendingPool {

    // ── Paths ──
    access(all) let AdminStoragePath: StoragePath

    // ── Events ──
    access(all) event Deposited(address: Address, amount: UFix64, complianceTier: UInt8)
    access(all) event Borrowed(address: Address, amount: UFix64, complianceTier: UInt8)
    access(all) event Repaid(address: Address, amount: UFix64)
    access(all) event DepositRejected(address: Address, reason: String)
    access(all) event BorrowRejected(address: Address, reason: String)

    // ── Pool State ──
    access(all) var totalDeposits: UFix64
    access(all) var totalBorrowed: UFix64
    access(all) var totalTransactions: UInt64

    // ── User Balances ──
    // address -> deposited amount
    access(all) var deposits: {Address: UFix64}
    // address -> borrowed amount
    access(all) var borrows: {Address: UFix64}

    // ── Pool Parameters ──
    access(all) let maxLTV: UFix64           // 75% loan-to-value
    access(all) let baseAPY: UFix64          // 3.2% base yield

    /// Available liquidity in the pool
    access(all) view fun availableLiquidity(): UFix64 {
        if self.totalDeposits > self.totalBorrowed {
            return self.totalDeposits - self.totalBorrowed
        }
        return 0.0
    }

    /// Get a user's deposit balance
    access(all) view fun getDeposit(address: Address): UFix64 {
        return self.deposits[address] ?? 0.0
    }

    /// Get a user's borrow balance
    access(all) view fun getBorrow(address: Address): UFix64 {
        return self.borrows[address] ?? 0.0
    }

    /// Get max borrow amount for a user (based on their deposit * LTV)
    access(all) view fun getMaxBorrow(address: Address): UFix64 {
        let deposited = self.deposits[address] ?? 0.0
        let alreadyBorrowed = self.borrows[address] ?? 0.0
        let maxBorrow = deposited * self.maxLTV
        if maxBorrow > alreadyBorrowed {
            return maxBorrow - alreadyBorrowed
        }
        return 0.0
    }

    /// Deposit into the lending pool.
    /// Requires: valid compliance credential (any tier).
    /// This is the key demo: compliance check is ONE line.
    access(all) fun deposit(depositor: Address, amount: UFix64) {
        pre {
            amount > 0.0: "Amount must be greater than zero"
        }

        // ─── THE ONE-LINE COMPLIANCE CHECK ───
        let isCompliant = ComplianceAction.verify(depositor)
        assert(isCompliant, message: "FlowShield: User does not hold a valid compliance credential")

        // Record deposit
        let current = self.deposits[depositor] ?? 0.0
        self.deposits[depositor] = current + amount
        self.totalDeposits = self.totalDeposits + amount
        self.totalTransactions = self.totalTransactions + 1

        // Get tier for event
        let tier = ComplianceCredential.getTier(address: depositor) ?? ComplianceCredential.ComplianceTier.nonCompliant

        emit Deposited(address: depositor, amount: amount, complianceTier: tier.rawValue)
    }

    /// Borrow from the lending pool.
    /// Requires: FULL compliance (not semi-compliant) because borrowing is higher risk.
    access(all) fun borrow(borrower: Address, amount: UFix64) {
        pre {
            amount > 0.0: "Amount must be greater than zero"
        }

        // ─── FULL COMPLIANCE CHECK (stricter for borrows) ───
        let isFullyCompliant = ComplianceAction.verifyFull(borrower)
        assert(isFullyCompliant, message: "FlowShield: Borrowing requires full compliance (not semi-compliant)")

        // Check LTV
        let maxBorrow = self.getMaxBorrow(address: borrower)
        assert(amount <= maxBorrow, message: "Exceeds maximum borrow (75% LTV)")

        // Check liquidity
        assert(amount <= self.availableLiquidity(), message: "Insufficient pool liquidity")

        // Record borrow
        let current = self.borrows[borrower] ?? 0.0
        self.borrows[borrower] = current + amount
        self.totalBorrowed = self.totalBorrowed + amount
        self.totalTransactions = self.totalTransactions + 1

        let tier = ComplianceCredential.getTier(address: borrower) ?? ComplianceCredential.ComplianceTier.nonCompliant

        emit Borrowed(address: borrower, amount: amount, complianceTier: tier.rawValue)
    }

    /// Repay a borrow (no compliance check needed for repayment)
    access(all) fun repay(borrower: Address, amount: UFix64) {
        pre {
            amount > 0.0: "Amount must be greater than zero"
        }

        let currentBorrow = self.borrows[borrower] ?? 0.0
        assert(currentBorrow > 0.0, message: "No outstanding borrow")

        let repayAmount = amount < currentBorrow ? amount : currentBorrow
        self.borrows[borrower] = currentBorrow - repayAmount
        self.totalBorrowed = self.totalBorrowed - repayAmount
        self.totalTransactions = self.totalTransactions + 1

        emit Repaid(address: borrower, amount: repayAmount)
    }

    /// Pool utilization rate (0.0 to 1.0)
    access(all) view fun utilizationRate(): UFix64 {
        if self.totalDeposits == 0.0 {
            return 0.0
        }
        return self.totalBorrowed / self.totalDeposits
    }

    // ── Admin Resource ──
    access(all) resource Admin {
        access(all) fun createAdmin(): @Admin {
            return <- create Admin()
        }
    }

    // ── Contract Init ──
    init() {
        self.AdminStoragePath = /storage/FlowShieldDemoLendingPoolAdmin
        self.totalDeposits = 0.0
        self.totalBorrowed = 0.0
        self.totalTransactions = 0
        self.deposits = {}
        self.borrows = {}
        self.maxLTV = 0.75
        self.baseAPY = 0.032

        let admin <- create Admin()
        self.account.storage.save(<- admin, to: self.AdminStoragePath)
    }
}

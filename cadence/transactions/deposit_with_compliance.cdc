/// deposit_with_compliance.cdc
/// Demo transaction: compliant deposit into lending pool.
/// User signs, protocol pays gas (sponsored transaction).
/// Compliance check happens inside DemoLendingPool.deposit() — invisible to user.

import DemoLendingPool from "../contracts/DemoLendingPool.cdc"

transaction(amount: UFix64) {
    let userAddress: Address

    prepare(userAccount: auth(Storage) &Account) {
        self.userAddress = userAccount.address
    }

    execute {
        // The compliance check happens INSIDE deposit()
        // via ComplianceAction.verify(). The user never sees it.
        DemoLendingPool.deposit(depositor: self.userAddress, amount: amount)
    }

    post {
        DemoLendingPool.getDeposit(address: self.userAddress) > 0.0:
            "Deposit should be recorded"
    }
}

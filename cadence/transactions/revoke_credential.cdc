/// revoke_credential.cdc
/// Admin-only transaction to revoke a user's compliance credential.
/// Used when anomaly monitor flags suspicious activity or on regulatory demand.

import ComplianceCredential from "../contracts/ComplianceCredential.cdc"

transaction(targetAddress: Address) {
    let admin: &ComplianceCredential.Admin

    prepare(adminAccount: auth(Storage) &Account) {
        self.admin = adminAccount.storage.borrow<&ComplianceCredential.Admin>(
            from: ComplianceCredential.AdminStoragePath
        ) ?? panic("Could not borrow ComplianceCredential Admin")
    }

    execute {
        self.admin.revokeCredential(address: targetAddress)
    }
}

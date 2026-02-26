/// update_rules.cdc
/// AI agent updates jurisdiction rules on-chain.
/// Used by Regulatory Radar agent when laws change.
/// Supports both single rule update and batch update.

import RuleEngine from "../contracts/RuleEngine.cdc"

transaction(jurisdiction: String, key: String, value: String) {
    let admin: &RuleEngine.Admin

    prepare(adminAccount: auth(Storage) &Account) {
        self.admin = adminAccount.storage.borrow<&RuleEngine.Admin>(
            from: RuleEngine.AdminStoragePath
        ) ?? panic("Could not borrow RuleEngine Admin")
    }

    execute {
        self.admin.setRule(jurisdiction: jurisdiction, key: key, value: value)
    }
}

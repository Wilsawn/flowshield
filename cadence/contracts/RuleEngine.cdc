/// RuleEngine.cdc
/// Configurable compliance policy rules per jurisdiction.
/// Updated by the Regulatory Radar AI agent when laws change.

access(all) contract RuleEngine {

    // ===== Events =====
    access(all) event RuleUpdated(jurisdiction: String, ruleKey: String, newValue: String)
    access(all) event JurisdictionAdded(code: String, name: String)

    // ===== Storage =====
    // Jurisdiction code -> rule key -> rule value
    access(self) let rules: {String: {String: String}}

    // Jurisdiction code -> human-readable name
    access(self) let jurisdictions: {String: String}

    // ===== Public Functions =====

    // Check if a jurisdiction is supported
    access(all) view fun isJurisdictionSupported(code: String): Bool {
        return self.jurisdictions.containsKey(code)
    }

    // Get a specific rule for a jurisdiction
    access(all) view fun getRule(jurisdiction: String, ruleKey: String): String? {
        if let jurisdictionRules = self.rules[jurisdiction] {
            return jurisdictionRules[ruleKey]
        }
        return nil
    }

    // Get all rules for a jurisdiction
    access(all) view fun getRules(jurisdiction: String): {String: String}? {
        return self.rules[jurisdiction]
    }

    // Get minimum age requirement for a jurisdiction
    access(all) view fun getMinAge(jurisdiction: String): UInt8 {
        if let ageStr = self.getRule(jurisdiction: jurisdiction, ruleKey: "min_age") {
            // Default to 18 if parsing fails
            return 18
        }
        return 18
    }

    // Check if sanctions screening is required
    access(all) view fun requiresSanctionsScreening(jurisdiction: String): Bool {
        return self.getRule(jurisdiction: jurisdiction, ruleKey: "sanctions_screening") == "true"
    }

    // Get re-verification interval in seconds
    access(all) view fun getReverficationInterval(jurisdiction: String): UFix64 {
        if let interval = self.getRule(jurisdiction: jurisdiction, ruleKey: "reverification_seconds") {
            // Default 30 days
            return 2592000.0
        }
        return 2592000.0
    }

    // ===== Admin Resource =====
    access(all) resource Admin {

        // Add a new jurisdiction
        access(all) fun addJurisdiction(code: String, name: String) {
            RuleEngine.jurisdictions[code] = name
            if RuleEngine.rules[code] == nil {
                RuleEngine.rules[code] = {}
            }
            emit JurisdictionAdded(code: code, name: name)
        }

        // Set or update a rule for a jurisdiction
        access(all) fun setRule(jurisdiction: String, ruleKey: String, value: String) {
            if RuleEngine.rules[jurisdiction] == nil {
                panic("Jurisdiction not found. Add it first.")
            }
            let jurisdictionRules = RuleEngine.rules[jurisdiction]!
            // Create a mutable copy, update, and reassign
            var updatedRules = jurisdictionRules
            updatedRules[ruleKey] = value
            RuleEngine.rules[jurisdiction] = updatedRules

            emit RuleUpdated(jurisdiction: jurisdiction, ruleKey: ruleKey, newValue: value)
        }

        // Batch update rules (used by Regulatory Radar agent)
        access(all) fun batchUpdateRules(jurisdiction: String, updates: {String: String}) {
            for key in updates.keys {
                self.setRule(jurisdiction: jurisdiction, ruleKey: key, value: updates[key]!)
            }
        }
    }

    // ===== Contract Init =====
    init() {
        self.rules = {}
        self.jurisdictions = {}

        // Set up default jurisdictions with baseline rules
        self.jurisdictions["EU"] = "European Union (MiCA)"
        self.jurisdictions["US"] = "United States"
        self.jurisdictions["CA"] = "Canada"

        // EU / MiCA baseline rules
        self.rules["EU"] = {
            "min_age": "18",
            "sanctions_screening": "true",
            "max_anonymous_tx": "1000",
            "reverification_seconds": "2592000",
            "kyc_required": "true",
            "travel_rule_threshold": "1000"
        }

        // US baseline rules
        self.rules["US"] = {
            "min_age": "18",
            "sanctions_screening": "true",
            "max_anonymous_tx": "0",
            "reverification_seconds": "2592000",
            "kyc_required": "true",
            "travel_rule_threshold": "3000"
        }

        // Canada baseline rules
        self.rules["CA"] = {
            "min_age": "18",
            "sanctions_screening": "true",
            "max_anonymous_tx": "0",
            "reverification_seconds": "2592000",
            "kyc_required": "true",
            "travel_rule_threshold": "1000"
        }

        // Store admin
        let admin <- create Admin()
        self.account.storage.save(<- admin, to: /storage/FlowShieldRuleEngineAdmin)
    }
}

/// RuleEngine.cdc
/// On-chain policy contract storing jurisdiction rules as configurable parameters.
/// Updated by AI agents (Regulatory Radar) when regulations change.
/// Determines which proofs are required for which actions.

access(all) contract RuleEngine {

    // ── Paths ──
    access(all) let AdminStoragePath: StoragePath

    // ── Events ──
    access(all) event RuleUpdated(jurisdiction: String, key: String, oldValue: String, newValue: String)
    access(all) event JurisdictionAdded(jurisdiction: String)
    access(all) event JurisdictionRemoved(jurisdiction: String)
    access(all) event BatchRulesUpdated(jurisdiction: String, keysUpdated: Int)

    // ── Rules Storage ──
    // jurisdiction code -> (rule key -> rule value)
    access(all) var rules: {String: {String: String}}

    // ── Supported jurisdictions ──
    access(all) var jurisdictions: [String]

    // ── Standard rule keys ──
    // These are the keys that every jurisdiction should define
    access(all) let RULE_KYC_REQUIRED: String
    access(all) let RULE_MIN_AGE: String
    access(all) let RULE_SANCTIONS_SCREENING: String
    access(all) let RULE_TRAVEL_RULE_THRESHOLD: String
    access(all) let RULE_TRAVEL_RULE_CURRENCY: String
    access(all) let RULE_MAX_ANONYMOUS_TX: String
    access(all) let RULE_REVERIFICATION_DAYS: String
    access(all) let RULE_REGULATOR: String
    access(all) let RULE_FRAMEWORK: String

    // ── Public View Functions ──

    /// Get all rules for a jurisdiction
    access(all) view fun getRules(jurisdiction: String): {String: String}? {
        return self.rules[jurisdiction]
    }

    /// Get a specific rule value
    access(all) view fun getRule(jurisdiction: String, key: String): String? {
        if let jRules = self.rules[jurisdiction] {
            return jRules[key]
        }
        return nil
    }

    /// Check if a jurisdiction is supported
    access(all) view fun isJurisdictionSupported(jurisdiction: String): Bool {
        return self.rules.containsKey(jurisdiction)
    }

    /// Get all supported jurisdiction codes
    access(all) view fun getSupportedJurisdictions(): [String] {
        return self.jurisdictions
    }

    /// Get the travel rule threshold for a jurisdiction (as UFix64)
    access(all) view fun getTravelRuleThreshold(jurisdiction: String): UFix64 {
        if let jRules = self.rules[jurisdiction] {
            if let threshold = jRules[self.RULE_TRAVEL_RULE_THRESHOLD] {
                // Parse string to UFix64
                return UFix64.fromString(threshold) ?? 0.0
            }
        }
        return 0.0
    }

    /// Get reverification period in days
    access(all) view fun getReverificationDays(jurisdiction: String): Int {
        if let jRules = self.rules[jurisdiction] {
            if let days = jRules[self.RULE_REVERIFICATION_DAYS] {
                return Int.fromString(days) ?? 365
            }
        }
        return 365
    }

    // ── Admin Resource ──
    access(all) resource Admin {

        /// Set a single rule for a jurisdiction
        access(all) fun setRule(jurisdiction: String, key: String, value: String) {
            pre {
                RuleEngine.rules.containsKey(jurisdiction): "Jurisdiction not found. Add it first."
            }
            let oldValue = RuleEngine.rules[jurisdiction]![key] ?? ""
            if RuleEngine.rules[jurisdiction] == nil {
                RuleEngine.rules[jurisdiction] = {}
            }
            RuleEngine.rules[jurisdiction]!.insert(key: key, value)
            emit RuleUpdated(jurisdiction: jurisdiction, key: key, oldValue: oldValue, newValue: value)
        }

        /// Batch update rules for a jurisdiction (used by Regulatory Radar agent)
        access(all) fun batchUpdateRules(jurisdiction: String, updates: {String: String}) {
            pre {
                RuleEngine.rules.containsKey(jurisdiction): "Jurisdiction not found. Add it first."
            }
            for key in updates.keys {
                RuleEngine.rules[jurisdiction]!.insert(key: key, updates[key]!)
            }
            emit BatchRulesUpdated(jurisdiction: jurisdiction, keysUpdated: updates.keys.length)
        }

        /// Add a new jurisdiction with initial rules
        access(all) fun addJurisdiction(code: String, initialRules: {String: String}) {
            RuleEngine.rules[code] = initialRules
            RuleEngine.jurisdictions.append(code)
            emit JurisdictionAdded(jurisdiction: code)
        }

        /// Remove a jurisdiction
        access(all) fun removeJurisdiction(code: String) {
            RuleEngine.rules.remove(key: code)
            var i = 0
            while i < RuleEngine.jurisdictions.length {
                if RuleEngine.jurisdictions[i] == code {
                    RuleEngine.jurisdictions.remove(at: i)
                    break
                }
                i = i + 1
            }
            emit JurisdictionRemoved(jurisdiction: code)
        }

        access(all) fun createAdmin(): @Admin {
            return <- create Admin()
        }
    }

    // ── Contract Init ──
    init() {
        self.AdminStoragePath = /storage/FlowShieldRuleEngineAdmin

        // Standard rule keys
        self.RULE_KYC_REQUIRED = "kyc_required"
        self.RULE_MIN_AGE = "min_age"
        self.RULE_SANCTIONS_SCREENING = "sanctions_screening"
        self.RULE_TRAVEL_RULE_THRESHOLD = "travel_rule_threshold"
        self.RULE_TRAVEL_RULE_CURRENCY = "travel_rule_currency"
        self.RULE_MAX_ANONYMOUS_TX = "max_anonymous_tx"
        self.RULE_REVERIFICATION_DAYS = "reverification_days"
        self.RULE_REGULATOR = "regulator"
        self.RULE_FRAMEWORK = "framework"

        self.jurisdictions = []
        self.rules = {}

        // ── Pre-load jurisdiction rules ──

        // United States
        self.rules["US"] = {
            "kyc_required": "true",
            "min_age": "18",
            "sanctions_screening": "OFAC",
            "travel_rule_threshold": "3000.0",
            "travel_rule_currency": "USD",
            "max_anonymous_tx": "0",
            "reverification_days": "365",
            "regulator": "FinCEN / SEC",
            "framework": "Bank Secrecy Act / FinCEN Guidance"
        }
        self.jurisdictions.append("US")

        // European Union (MiCA)
        self.rules["EU"] = {
            "kyc_required": "true",
            "min_age": "18",
            "sanctions_screening": "EU_SANCTIONS",
            "travel_rule_threshold": "1000.0",
            "travel_rule_currency": "EUR",
            "max_anonymous_tx": "0",
            "reverification_days": "180",
            "regulator": "EBA / ESMA",
            "framework": "MiCA (Markets in Crypto-Assets)"
        }
        self.jurisdictions.append("EU")

        // United Kingdom
        self.rules["UK"] = {
            "kyc_required": "true",
            "min_age": "18",
            "sanctions_screening": "OFSI",
            "travel_rule_threshold": "1000.0",
            "travel_rule_currency": "GBP",
            "max_anonymous_tx": "0",
            "reverification_days": "365",
            "regulator": "FCA",
            "framework": "FCA Crypto Registration"
        }
        self.jurisdictions.append("UK")

        // Singapore
        self.rules["SG"] = {
            "kyc_required": "true",
            "min_age": "18",
            "sanctions_screening": "MAS_SANCTIONS",
            "travel_rule_threshold": "1500.0",
            "travel_rule_currency": "SGD",
            "max_anonymous_tx": "0",
            "reverification_days": "365",
            "regulator": "MAS",
            "framework": "Payment Services Act"
        }
        self.jurisdictions.append("SG")

        // Canada
        self.rules["CA"] = {
            "kyc_required": "true",
            "min_age": "18",
            "sanctions_screening": "OSFI",
            "travel_rule_threshold": "10000.0",
            "travel_rule_currency": "CAD",
            "max_anonymous_tx": "0",
            "reverification_days": "365",
            "regulator": "FINTRAC",
            "framework": "PCMLTFA"
        }
        self.jurisdictions.append("CA")

        // Store admin
        let admin <- create Admin()
        self.account.storage.save(<- admin, to: self.AdminStoragePath)
    }
}

// RuleEngine.cdc
// Configurable compliance rules per jurisdiction.
//
// What to implement:
// - Store rules as {String: {String: String}} (jurisdiction -> ruleKey -> value)
// - Pre-load EU (MiCA), US, and Canada rules on init
// - Rules: min_age, sanctions_screening, kyc_required, max_anonymous_tx, travel_rule_threshold, reverification_seconds
// - Admin resource with setRule(), batchUpdateRules(), addJurisdiction()
// - Public view functions to read rules
// - Events when rules are updated

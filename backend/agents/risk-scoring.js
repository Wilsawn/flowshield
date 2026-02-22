// risk-scoring.js
// Rule-based risk scoring agent. No LLM API needed.
//
// What to implement:
// - Define risk factors with point values:
//   - Account age < 7 days (+15), < 30 days (+8)
//   - High tx volume in 24h (+20)
//   - Rapid in-out pattern (+25)
//   - Flagged contract interaction (+30)
//   - Mixer interaction (+35)
//   - Multiple wallet funding sources (+15)
//   - Dormant then suddenly active (+12)
// - calculateRiskScore(walletData) -> { score, tier, factors }
// - fetchWalletData(address) -> query Flow Access API for public chain data
// - Score 0-30 = compliant, 31-70 = semi-compliant, 71-100 = non-compliant

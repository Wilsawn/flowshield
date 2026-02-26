/// get_risk_score.cdc
/// Read-only script to get a user's risk score and compliance tier.

import ComplianceCredential from "../contracts/ComplianceCredential.cdc"

access(all) struct RiskInfo {
    access(all) let hasCredential: Bool
    access(all) let riskScore: UInt64
    access(all) let tier: UInt8
    access(all) let tierLabel: String

    init(hasCredential: Bool, riskScore: UInt64, tier: UInt8, tierLabel: String) {
        self.hasCredential = hasCredential
        self.riskScore = riskScore
        self.tier = tier
        self.tierLabel = tierLabel
    }
}

access(all) fun main(address: Address): RiskInfo {
    let account = getAccount(address)
    let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
        ComplianceCredential.PublicPath
    )

    if let cred = credRef {
        let tier = cred.getTier()
        var tierLabel = "nonCompliant"
        if tier == ComplianceCredential.ComplianceTier.compliant {
            tierLabel = "compliant"
        } else if tier == ComplianceCredential.ComplianceTier.semiCompliant {
            tierLabel = "semiCompliant"
        }

        return RiskInfo(
            hasCredential: true,
            riskScore: cred.getRiskScore(),
            tier: tier.rawValue,
            tierLabel: tierLabel
        )
    }

    return RiskInfo(
        hasCredential: false,
        riskScore: 0,
        tier: 2,
        tierLabel: "none"
    )
}

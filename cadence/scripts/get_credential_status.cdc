/// get_credential_status.cdc
/// Read-only script to get full credential details for an address.
/// Returns nil-safe values — works even if user has no credential.

import ComplianceCredential from "../contracts/ComplianceCredential.cdc"

access(all) struct CredentialDetails {
    access(all) let tier: UInt8
    access(all) let tierLabel: String
    access(all) let riskScore: UInt64
    access(all) let expiresAt: UFix64
    access(all) let isExpired: Bool
    access(all) let isValid: Bool
    access(all) let proofHash: String
    access(all) let jurisdiction: String
    access(all) let issuedAt: UFix64

    init(tier: UInt8, tierLabel: String, riskScore: UInt64, expiresAt: UFix64, isExpired: Bool, isValid: Bool, proofHash: String, jurisdiction: String, issuedAt: UFix64) {
        self.tier = tier
        self.tierLabel = tierLabel
        self.riskScore = riskScore
        self.expiresAt = expiresAt
        self.isExpired = isExpired
        self.isValid = isValid
        self.proofHash = proofHash
        self.jurisdiction = jurisdiction
        self.issuedAt = issuedAt
    }
}

access(all) fun main(address: Address): CredentialDetails? {
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

        return CredentialDetails(
            tier: tier.rawValue,
            tierLabel: tierLabel,
            riskScore: cred.getRiskScore(),
            expiresAt: cred.getExpiresAt(),
            isExpired: cred.isExpired(),
            isValid: cred.isValid(),
            proofHash: cred.getProofHash(),
            jurisdiction: cred.getJurisdiction(),
            issuedAt: cred.getIssuedAt()
        )
    }

    return nil
}

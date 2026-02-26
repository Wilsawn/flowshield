/// check_compliance.cdc
/// Read-only script to check a user's compliance status.
/// Returns a struct with all relevant compliance information.

import ComplianceCredential from "../contracts/ComplianceCredential.cdc"

access(all) struct ComplianceStatus {
    access(all) let hasCredential: Bool
    access(all) let isValid: Bool
    access(all) let isExpired: Bool
    access(all) let tier: UInt8
    access(all) let riskScore: UInt64
    access(all) let expiresAt: UFix64
    access(all) let jurisdiction: String
    access(all) let proofHash: String
    access(all) let issuedAt: UFix64

    init(
        hasCredential: Bool,
        isValid: Bool,
        isExpired: Bool,
        tier: UInt8,
        riskScore: UInt64,
        expiresAt: UFix64,
        jurisdiction: String,
        proofHash: String,
        issuedAt: UFix64
    ) {
        self.hasCredential = hasCredential
        self.isValid = isValid
        self.isExpired = isExpired
        self.tier = tier
        self.riskScore = riskScore
        self.expiresAt = expiresAt
        self.jurisdiction = jurisdiction
        self.proofHash = proofHash
        self.issuedAt = issuedAt
    }
}

access(all) fun main(address: Address): ComplianceStatus {
    let account = getAccount(address)
    let credRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
        ComplianceCredential.PublicPath
    )

    if let cred = credRef {
        return ComplianceStatus(
            hasCredential: true,
            isValid: cred.isValid(),
            isExpired: cred.isExpired(),
            tier: cred.getTier().rawValue,
            riskScore: cred.getRiskScore(),
            expiresAt: cred.getExpiresAt(),
            jurisdiction: cred.getJurisdiction(),
            proofHash: cred.getProofHash(),
            issuedAt: cred.getIssuedAt()
        )
    }

    return ComplianceStatus(
        hasCredential: false,
        isValid: false,
        isExpired: false,
        tier: 2,
        riskScore: 0,
        expiresAt: 0.0,
        jurisdiction: "",
        proofHash: "",
        issuedAt: 0.0
    )
}

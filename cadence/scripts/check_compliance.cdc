/// check_compliance.cdc
/// Script to check if an account has a valid compliance credential.
/// Any DeFi protocol can call this to verify a user before allowing access.

import ComplianceCredential from "../contracts/ComplianceCredential.cdc"

access(all) fun main(address: Address): {String: AnyStruct} {
    let account = getAccount(address)

    // Try to borrow the public credential capability
    if let credentialRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
        ComplianceCredential.CredentialPublicPath
    ) {
        return {
            "hasCredential": true,
            "isValid": credentialRef.isValid(),
            "tier": credentialRef.getTier().rawValue,
            "riskScore": credentialRef.getRiskScore(),
            "expiresAt": credentialRef.getExpiresAt(),
            "isExpired": credentialRef.isExpired()
        }
    }

    return {
        "hasCredential": false,
        "isValid": false,
        "tier": 2,
        "riskScore": 100,
        "expiresAt": 0.0,
        "isExpired": true
    }
}

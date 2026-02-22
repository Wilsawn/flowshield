/// ComplianceAction.cdc
/// Flow Actions primitive for composable compliance verification.
/// TODO: Implement Flow Actions interface once confirmed with Flow team.
/// This contract will conform to the standard Flow Actions interfaces
/// so developers can compose it with other DeFi actions (swap, source, sink).

import ComplianceCredential from "./ComplianceCredential.cdc"

access(all) contract ComplianceAction {

    // ===== Events =====
    access(all) event ComplianceVerified(address: Address, action: String)

    /// Verify compliance before allowing a DeFi action.
    /// This is the composable primitive other protocols call.
    access(all) fun verify(address: Address): Bool {
        let account = getAccount(address)

        if let credentialRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.CredentialPublicPath
        ) {
            if credentialRef.isValid() {
                emit ComplianceVerified(address: address, action: "access_granted")
                return true
            }
        }
        return false
    }

    /// Verify and require full compliance (not semi-compliant)
    access(all) fun verifyFull(address: Address): Bool {
        let account = getAccount(address)

        if let credentialRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.CredentialPublicPath
        ) {
            if credentialRef.isValid() && credentialRef.getTier() == ComplianceCredential.ComplianceTier.compliant {
                emit ComplianceVerified(address: address, action: "full_access_granted")
                return true
            }
        }
        return false
    }

    init() {}
}

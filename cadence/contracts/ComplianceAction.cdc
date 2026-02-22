// ComplianceAction.cdc
// Composable Flow Actions primitive for compliance verification.
//
// What to implement:
// - verify(address) -> Bool : checks if user has any valid credential
// - verifyFull(address) -> Bool : checks if user is fully compliant (not semi)
// - Borrow CredentialPublic capability from the user's account
// - Emit events on verification

// ComplianceAction_test.cdc
// Tests for the composable compliance action.
//
// What to test:
// - verify() returns true for user with valid credential
// - verify() returns false for user with no credential
// - verify() returns false for user with expired credential
// - verifyFull() returns false for semi-compliant user
// - verifyFull() returns true for fully compliant user

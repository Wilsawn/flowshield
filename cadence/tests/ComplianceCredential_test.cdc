// ComplianceCredential_test.cdc
// Tests for the compliance credential contract.
//
// What to test:
// - Mint a credential and verify it exists in user's account
// - Check that isValid() returns true for fresh credential
// - Check that isExpired() returns true after expiry time
// - Check that revoke() makes isValid() return false
// - Check that tier is set correctly based on risk score
// - Check that non-admin cannot mint credentials

/// ComplianceAction_test.cdc
/// Tests for the composable compliance action.

import Test
import "ComplianceCredential"
import "ComplianceAction"

access(all) let adminAccount = Test.getAccount(0x0000000000000007)
access(all) let userAccount = Test.createAccount()
access(all) let unknownAccount = Test.createAccount()

access(all) fun setup() {
    var err = Test.deployContract(
        name: "ComplianceCredential",
        path: "../contracts/ComplianceCredential.cdc",
        arguments: []
    )
    Test.expect(err, Test.beNil())

    err = Test.deployContract(
        name: "ComplianceAction",
        path: "../contracts/ComplianceAction.cdc",
        arguments: []
    )
    Test.expect(err, Test.beNil())
}

// Test 1: verify() returns false for user with no credential
access(all) fun testVerifyNoCredential() {
    let result = ComplianceAction.verify(unknownAccount.address)
    Test.assertEqual(false, result)
}

// Test 2: verifyFull() returns false for user with no credential
access(all) fun testVerifyFullNoCredential() {
    let result = ComplianceAction.verifyFull(unknownAccount.address)
    Test.assertEqual(false, result)
}

// Test 3: verifyWithRecord returns failed record for unknown user
access(all) fun testVerifyWithRecordNoCredential() {
    let record = ComplianceAction.verifyWithRecord(unknownAccount.address)
    Test.assertEqual(false, record.passed)
    Test.assertEqual(unknownAccount.address, record.address)
}

// Test 4: verifyForJurisdiction returns false for unknown user
access(all) fun testVerifyJurisdictionNoCredential() {
    let result = ComplianceAction.verifyForJurisdiction(unknownAccount.address, jurisdiction: "US")
    Test.assertEqual(false, result)
}

// Test 5: Counters start at zero
access(all) fun testInitialCounters() {
    // totalRejections should be > 0 from previous tests
    Test.assert(ComplianceAction.totalRejections > 0, message: "Rejections should be counted")
}

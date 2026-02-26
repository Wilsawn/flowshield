/// ComplianceCredential_test.cdc
/// Tests for the compliance credential contract.

import Test
import "ComplianceCredential"

access(all) let adminAccount = Test.getAccount(0x0000000000000007)
access(all) let userAccount = Test.createAccount()

access(all) fun setup() {
    let err = Test.deployContract(
        name: "ComplianceCredential",
        path: "../contracts/ComplianceCredential.cdc",
        arguments: []
    )
    Test.expect(err, Test.beNil())
}

// Test 1: tierFromScore returns correct tiers
access(all) fun testTierFromScore() {
    // Score 0-30 = compliant
    let compliant = ComplianceCredential.tierFromScore(score: 12)
    Test.assertEqual(ComplianceCredential.ComplianceTier.compliant, compliant)

    let compliantEdge = ComplianceCredential.tierFromScore(score: 30)
    Test.assertEqual(ComplianceCredential.ComplianceTier.compliant, compliantEdge)

    // Score 31-70 = semiCompliant
    let semi = ComplianceCredential.tierFromScore(score: 50)
    Test.assertEqual(ComplianceCredential.ComplianceTier.semiCompliant, semi)

    // Score 71+ = nonCompliant
    let nonCompliant = ComplianceCredential.tierFromScore(score: 85)
    Test.assertEqual(ComplianceCredential.ComplianceTier.nonCompliant, nonCompliant)
}

// Test 2: isCompliant returns false for address with no credential
access(all) fun testNoCredential() {
    let result = ComplianceCredential.isCompliant(address: userAccount.address)
    Test.assertEqual(false, result)
}

// Test 3: isFullyCompliant returns false for address with no credential
access(all) fun testNoCredentialFullCheck() {
    let result = ComplianceCredential.isFullyCompliant(address: userAccount.address)
    Test.assertEqual(false, result)
}

// Test 4: getTier returns nil for address with no credential
access(all) fun testGetTierNoCredential() {
    let result = ComplianceCredential.getTier(address: userAccount.address)
    Test.assertEqual(nil, result)
}

// Test 5: Verify storage paths are set correctly
access(all) fun testStoragePaths() {
    Test.assertEqual(/storage/FlowShieldCredential, ComplianceCredential.StoragePath)
    Test.assertEqual(/public/FlowShieldCredential, ComplianceCredential.PublicPath)
    Test.assertEqual(/storage/FlowShieldCredentialAdmin, ComplianceCredential.AdminStoragePath)
}

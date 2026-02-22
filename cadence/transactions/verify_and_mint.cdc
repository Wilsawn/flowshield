/// verify_and_mint.cdc
/// Transaction to verify a ZK proof and mint a compliance credential.
/// The user is the proposer/authorizer, the protocol is the payer (sponsored gas).

import ComplianceCredential from "../contracts/ComplianceCredential.cdc"
import ZKVerifier from "../contracts/ZKVerifier.cdc"

transaction(
    proofData: String,
    verifierKey: String,
    claimsHash: String,
    riskScore: UInt8
) {
    let admin: &ComplianceCredential.Admin

    prepare(adminAccount: auth(BorrowValue) &Account, userAccount: auth(SaveValue, IssueStorageCapabilityController, PublishCapability) &Account) {
        // Borrow the admin resource from the FlowShield deployer account
        self.admin = adminAccount.storage.borrow<&ComplianceCredential.Admin>(
            from: /storage/FlowShieldAdmin
        ) ?? panic("Could not borrow FlowShield Admin resource")

        // Step 1: Verify the ZK proof
        let proofValid = ZKVerifier.verifyProof(
            proofData: proofData,
            verifierKey: verifierKey,
            claimsHash: claimsHash
        )

        if !proofValid {
            panic("ZK proof verification failed. User is non-compliant.")
        }

        // Step 2: Determine compliance tier based on risk score
        var tier = ComplianceCredential.ComplianceTier.nonCompliant
        var durationSeconds: UFix64 = 0.0

        if riskScore <= 30 {
            // Low risk -> compliant, 30 day credential
            tier = ComplianceCredential.ComplianceTier.compliant
            durationSeconds = 2592000.0 // 30 days
        } else if riskScore <= 70 {
            // Medium risk -> semi-compliant, 7 day credential
            tier = ComplianceCredential.ComplianceTier.semiCompliant
            durationSeconds = 604800.0 // 7 days
        } else {
            // High risk -> non-compliant
            panic("Risk score too high. User is non-compliant.")
        }

        // Step 3: Mint the credential
        let credential <- self.admin.mintCredential(
            tier: tier,
            riskScore: riskScore,
            durationSeconds: durationSeconds,
            proofHash: claimsHash
        )

        // Step 4: Store in user's account
        userAccount.storage.save(<- credential, to: ComplianceCredential.CredentialStoragePath)

        // Step 5: Create and publish public capability
        let cap = userAccount.capabilities.storage.issue<&{ComplianceCredential.CredentialPublic}>(
            ComplianceCredential.CredentialStoragePath
        )
        userAccount.capabilities.publish(cap, at: ComplianceCredential.CredentialPublicPath)
    }

    execute {
        log("Compliance credential minted successfully")
    }
}

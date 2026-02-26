/// verify_and_mint.cdc
/// Verify ZK proof and mint compliance credential.
/// Two signers: admin account (payer/sponsor) + user account.
/// This is a sponsored transaction — user pays zero gas.

import ComplianceCredential from "../contracts/ComplianceCredential.cdc"
import ZKVerifier from "../contracts/ZKVerifier.cdc"

transaction(
    proof: String,
    claimsHash: String,
    verifierName: String,
    signature: String,
    jurisdiction: String,
    riskScore: UInt64
) {
    let admin: &ComplianceCredential.Admin
    let userAccount: auth(Storage, Capabilities) &Account

    prepare(adminAccount: auth(Storage) &Account, userAccount: auth(Storage, Capabilities) &Account) {
        // Borrow admin resource from the FlowShield admin account
        self.admin = adminAccount.storage.borrow<&ComplianceCredential.Admin>(
            from: ComplianceCredential.AdminStoragePath
        ) ?? panic("Could not borrow ComplianceCredential Admin")

        self.userAccount = userAccount
    }

    execute {
        // Step 1: Build proof data
        let proofData = ZKVerifier.ProofData(
            proof: proof,
            claimsHash: claimsHash,
            verifierName: verifierName,
            signature: signature,
            jurisdiction: jurisdiction,
            timestamp: getCurrentBlock().timestamp
        )

        // Step 2: Verify ZK proof
        let result = ZKVerifier.verifyProof(proofData: proofData, userAddress: self.userAccount.address)
        assert(result.valid, message: "ZK proof verification failed: ".concat(result.reason))

        // Step 3: Determine tier from risk score
        let tier = ComplianceCredential.tierFromScore(score: riskScore)

        // Step 4: Reject non-compliant users
        assert(
            tier != ComplianceCredential.ComplianceTier.nonCompliant,
            message: "Risk score too high for credential issuance"
        )

        // Step 5: Calculate expiration (90 days from now)
        let expiresAt = getCurrentBlock().timestamp + 7776000.0  // 90 days in seconds

        // Step 6: Mint credential into user's account
        self.admin.mintCredential(
            recipient: self.userAccount,
            tier: tier,
            riskScore: riskScore,
            expiresAt: expiresAt,
            proofHash: result.proofHash,
            jurisdiction: jurisdiction
        )
    }
}

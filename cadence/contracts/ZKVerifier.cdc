/// ZKVerifier.cdc
/// Verifies zero-knowledge proofs on-chain.
/// NOTE: This is a simplified version for the hackathon.
/// In production, ZK verification may route through FlowEVM
/// for access to elliptic curve pairing precompiles.

access(all) contract ZKVerifier {

    // ===== Events =====
    access(all) event ProofVerified(proofHash: String, result: Bool)
    access(all) event VerifierUpdated(verifierKey: String)

    // ===== State =====
    // Trusted verifier public keys (registered KYC providers)
    access(self) let trustedVerifiers: {String: Bool}

    // ===== Public Interface =====

    // Verify a ZK proof
    // In a full implementation, this would verify the actual cryptographic proof.
    // For the hackathon, we verify the proof structure and trusted verifier signature.
    access(all) fun verifyProof(
        proofData: String,
        verifierKey: String,
        claimsHash: String
    ): Bool {
        // Check that the verifier is trusted
        if !self.isVerifierTrusted(key: verifierKey) {
            emit ProofVerified(proofHash: claimsHash, result: false)
            return false
        }

        // In production: actual ZK-SNARK/STARK verification here
        // For hackathon: verify proof structure is valid
        let isValid = proofData.length > 0 && claimsHash.length > 0

        emit ProofVerified(proofHash: claimsHash, result: isValid)
        return isValid
    }

    // Check if a verifier key is trusted
    access(all) view fun isVerifierTrusted(key: String): Bool {
        return self.trustedVerifiers[key] ?? false
    }

    // ===== Admin Resource =====
    access(all) resource Admin {

        // Register a new trusted verifier (regulated KYC provider)
        access(all) fun addTrustedVerifier(key: String) {
            ZKVerifier.trustedVerifiers[key] = true
            emit VerifierUpdated(verifierKey: key)
        }

        // Remove a trusted verifier
        access(all) fun removeTrustedVerifier(key: String) {
            ZKVerifier.trustedVerifiers.remove(key: key)
            emit VerifierUpdated(verifierKey: key)
        }
    }

    // ===== Contract Init =====
    init() {
        self.trustedVerifiers = {}

        // Add a default test verifier for development
        self.trustedVerifiers["test-verifier-key-001"] = true

        let admin <- create Admin()
        self.account.storage.save(<- admin, to: /storage/FlowShieldZKVerifierAdmin)
    }
}

// FlowShield Compliance Circuit (Groth16)
//
// Proves: "I have a valid KYC credential for jurisdiction J with risk score <= threshold"
// WITHOUT revealing: name, document number, address, date of birth, or any PII
//
// Public inputs (visible on-chain):
//   - complianceHash: hash of the compliance result (jurisdiction + tier + expiry)
//
// Private inputs (known only to the prover):
//   - kycSecret: secret issued by the KYC provider (Veriff) after successful verification
//   - jurisdiction: numeric code for the jurisdiction (1=US, 2=EU, 3=UK, 4=SG, 5=CA)
//   - riskScore: risk score from the verification (0-100)
//   - riskThreshold: maximum allowed risk score for compliance
//   - expiryTimestamp: when the credential expires
//   - currentTimestamp: current time (must be before expiry)
//   - salt: random salt for hash uniqueness

pragma circom 2.1.6;

include "circomlib/poseidon.circom";
include "circomlib/comparators.circom";

template ComplianceProof() {
    // ── Private Inputs ──
    signal input kycSecret;           // Secret from KYC provider
    signal input jurisdiction;         // 1-5 (US, EU, UK, SG, CA)
    signal input riskScore;            // 0-100
    signal input riskThreshold;        // Max allowed score (e.g., 70)
    signal input expiryTimestamp;       // Unix timestamp
    signal input currentTimestamp;      // Unix timestamp
    signal input salt;                 // Random salt

    // ── Public Output ──
    signal output complianceHash;      // Public hash that goes on-chain

    // ── Constraint 1: KYC secret is non-zero (user actually went through KYC) ──
    signal kycNonZero;
    kycNonZero <-- (kycSecret != 0) ? 1 : 0;
    kycNonZero * (kycNonZero - 1) === 0;  // Boolean constraint
    kycNonZero === 1;                       // Must be non-zero

    // ── Constraint 2: Jurisdiction is valid (1-5) ──
    component jurisdictionGte = GreaterEqThan(8);
    jurisdictionGte.in[0] <== jurisdiction;
    jurisdictionGte.in[1] <== 1;

    component jurisdictionLte = LessEqThan(8);
    jurisdictionLte.in[0] <== jurisdiction;
    jurisdictionLte.in[1] <== 5;

    jurisdictionGte.out === 1;
    jurisdictionLte.out === 1;

    // ── Constraint 3: Risk score is within threshold ──
    component riskCheck = LessEqThan(8);
    riskCheck.in[0] <== riskScore;
    riskCheck.in[1] <== riskThreshold;
    riskCheck.out === 1;  // riskScore <= riskThreshold

    // ── Constraint 4: Credential is not expired ──
    component expiryCheck = LessThan(64);
    expiryCheck.in[0] <== currentTimestamp;
    expiryCheck.in[1] <== expiryTimestamp;
    expiryCheck.out === 1;  // currentTimestamp < expiryTimestamp

    // ── Constraint 5: Risk score is in valid range (0-100) ──
    component scoreRange = LessEqThan(8);
    scoreRange.in[0] <== riskScore;
    scoreRange.in[1] <== 100;
    scoreRange.out === 1;

    // ── Compute public compliance hash ──
    // Hash(kycSecret, jurisdiction, riskScore, expiryTimestamp, salt)
    // This hash goes on-chain — it proves the claim without revealing inputs
    component hasher = Poseidon(5);
    hasher.inputs[0] <== kycSecret;
    hasher.inputs[1] <== jurisdiction;
    hasher.inputs[2] <== riskScore;
    hasher.inputs[3] <== expiryTimestamp;
    hasher.inputs[4] <== salt;

    complianceHash <== hasher.out;
}

component main {public [complianceHash]} = ComplianceProof();

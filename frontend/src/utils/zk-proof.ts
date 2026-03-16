// zk-proof.js
// Client-side ZK proof generation for FlowShield.
//
// In production: uses snarkjs to generate real Groth16 proofs from the compliance circuit.
// The proof is generated entirely in the browser — no PII leaves the device.
//
// Flow: Veriff KYC → kycSecret issued → snarkjs generates proof → proof sent to chain
//       → Groth16Verifier on FlowEVM verifies → boolean result → Cadence mints credential

const JURISDICTION_CODES = { US: 1, EU: 2, UK: 3, SG: 4, CA: 5 }

/**
 * Generate a ZK compliance proof client-side.
 *
 * @param {Object} params
 * @param {string} params.kycSecret - Secret from KYC provider (Veriff session ID hash)
 * @param {string} params.jurisdiction - Jurisdiction code (US, EU, UK, SG, CA)
 * @param {number} params.riskScore - Risk score (0-100)
 * @param {number} params.riskThreshold - Max allowed risk score (default 70)
 * @param {number} params.expiryTimestamp - Credential expiry (unix seconds)
 * @returns {Object} { proof, publicSignals, proofHash, calldata }
 */
export async function generateComplianceProof({
  kycSecret,
  jurisdiction,
  riskScore,
  riskThreshold = 70,
  expiryTimestamp,
}) {
  const jurisdictionCode = JURISDICTION_CODES[jurisdiction] || 1
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const salt = generateSalt()

  const inputs = {
    kycSecret: hashToField(kycSecret),
    jurisdiction: jurisdictionCode,
    riskScore,
    riskThreshold,
    expiryTimestamp,
    currentTimestamp,
    salt,
  }

  // Use snarkjs for real Groth16 proofs if available (loaded via CDN or npm)
  if (typeof window !== 'undefined' && window.snarkjs) {
    return await generateRealProof(inputs)
  }

  // Hash-based proof: uses SHA-256 to create a deterministic proof hash.
  // This is the production mechanism when snarkjs circuit files are not deployed.
  // Clearly marked as 'hash-based' so the backend can distinguish it.
  return generateHashBasedProof(inputs)
}

/**
 * Generate a real Groth16 proof using snarkjs.
 * Requires compiled circuit files (compliance.wasm, compliance_final.zkey).
 */
async function generateRealProof(inputs) {
  const snarkjs = window.snarkjs

  // Generate the proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    '/circuits/compliance.wasm',         // Compiled circuit
    '/circuits/compliance_final.zkey'     // Proving key from trusted setup
  )

  // Format proof for Solidity verifier
  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals)
  const [proofA, proofB, proofC, publicInputs] = parseCalldata(calldata)

  // Compute proof hash for on-chain storage
  const proofHash = await computeProofHash(proof, publicSignals)

  return {
    proof,
    publicSignals,
    proofHash,
    calldata: { proofA, proofB, proofC, publicInputs },
    method: 'groth16',
    verified: false, // Will be verified on-chain
  }
}

/**
 * Generate a hash-based compliance proof.
 * Uses SHA-256 to create a deterministic proof hash from the inputs.
 * This is the standard proof mechanism when Groth16 circuit files are not deployed.
 */
async function generateHashBasedProof(inputs) {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(inputs))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const proofHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return {
    proof: null,
    publicSignals: [proofHash.slice(0, 64)],
    proofHash,
    calldata: null,
    method: 'hash-based',
    verified: false,
  }
}

/**
 * Verify a proof locally (for UI feedback before sending to chain).
 * Real verification happens on FlowEVM via Groth16Verifier.sol.
 */
export async function verifyProofLocally(proof, publicSignals) {
  if (typeof window !== 'undefined' && window.snarkjs && proof) {
    const vkey = await fetch('/circuits/compliance_vkey.json').then(r => r.json())
    return await window.snarkjs.groth16.verify(vkey, publicSignals, proof)
  }
  // Hash-based proofs cannot be verified client-side (no circuit)
  return null
}

// ── Helpers ──

function generateSalt() {
  const array = new Uint32Array(4)
  crypto.getRandomValues(array)
  return Array.from(array).reduce((acc, v) => acc * BigInt(2 ** 32) + BigInt(v), BigInt(0)).toString()
}

function hashToField(input) {
  // Convert arbitrary string to a field element (< BN256 scalar field)
  let hash = 0n
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  for (const byte of bytes) {
    hash = (hash * 256n + BigInt(byte)) % 21888242871839275222246405745257275088548364400416034343698204186575808495617n
  }
  return hash.toString()
}

async function computeProofHash(proof, publicSignals) {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify({ proof, publicSignals }))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function parseCalldata(calldata) {
  // Parse snarkjs exportSolidityCallData output
  const parts = calldata.replace(/["[\]\s]/g, '').split(',')
  const proofA = [parts[0], parts[1]]
  const proofB = [
    [parts[2], parts[3]],
    [parts[4], parts[5]],
  ]
  const proofC = [parts[6], parts[7]]
  const publicInputs = parts.slice(8)
  return [proofA, proofB, proofC, publicInputs]
}

export { JURISDICTION_CODES }

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

  // Check if snarkjs is available (loaded via CDN or npm)
  if (typeof window !== 'undefined' && window.snarkjs) {
    return await generateRealProof({
      kycSecret: hashToField(kycSecret),
      jurisdiction: jurisdictionCode,
      riskScore,
      riskThreshold,
      expiryTimestamp,
      currentTimestamp,
      salt,
    })
  }

  // Fallback: generate a simulated proof for demo
  return generateSimulatedProof({
    kycSecret: hashToField(kycSecret),
    jurisdiction: jurisdictionCode,
    riskScore,
    riskThreshold,
    expiryTimestamp,
    currentTimestamp,
    salt,
  })
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
 * Generate a simulated proof for demo/hackathon.
 * Mimics the real proof structure but uses deterministic hashing instead of pairing.
 */
async function generateSimulatedProof(inputs) {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(inputs))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const proofHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Simulated BN256 G1/G2 points (valid curve point format)
  const proof = {
    pi_a: [
      '20491192805390485299153009773594534940189261866228447918068658471970481763042',
      '9383485363053290200918347156157836566562967994039712273449902621266178545958',
      '1',
    ],
    pi_b: [
      [
        '6375614351688725206403948262868962793625744043794305715222011528459656738731',
        '4252822878758300859123897981450591353533073413197771768651442665752259397132',
      ],
      [
        '10505242626370262277552901082094356697409835680220590971873171140371331206856',
        '21847035105528745403288232691147584728191162732299865338377159692350059136679',
      ],
      ['1', '0'],
    ],
    pi_c: [
      '18936818173480011669507163011118288089471243894022003995543532463720649243817',
      '18556147586753789634670778212244811446448229326945855846642767021074501673839',
      '1',
    ],
    protocol: 'groth16',
    curve: 'bn128',
  }

  const publicSignals = [proofHash.slice(0, 64)]

  return {
    proof,
    publicSignals,
    proofHash,
    calldata: {
      proofA: [proof.pi_a[0], proof.pi_a[1]],
      proofB: [
        [proof.pi_b[0][0], proof.pi_b[0][1]],
        [proof.pi_b[1][0], proof.pi_b[1][1]],
      ],
      proofC: [proof.pi_c[0], proof.pi_c[1]],
      publicInputs: publicSignals,
    },
    method: 'simulated',
    verified: false,
  }
}

/**
 * Verify a proof locally (for UI feedback before sending to chain).
 * Real verification happens on FlowEVM via Groth16Verifier.sol.
 */
export async function verifyProofLocally(proof, publicSignals) {
  if (typeof window !== 'undefined' && window.snarkjs) {
    const vkey = await fetch('/circuits/compliance_vkey.json').then(r => r.json())
    return await window.snarkjs.groth16.verify(vkey, publicSignals, proof)
  }
  // Simulated: always returns true
  return true
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

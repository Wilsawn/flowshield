# FlowEVM ZK Verifier

Groth16 ZK-SNARK proof verifier deployed on FlowEVM. Called from Cadence via Cadence-Owned Accounts (COAs).

## How It Works

```
User generates ZK proof (client-side, snarkjs)
    │
    ▼
Cadence ZKVerifier receives proof
    │
    ▼
COA.call() → FlowEVM Groth16Verifier.verifyProof()
    │         Uses BN256 precompiles (0x06, 0x07, 0x08)
    ▼
Returns boolean → Cadence mints ComplianceCredential
```

## Contracts

| File | Purpose |
|---|---|
| `Groth16Verifier.sol` | Full Groth16 verifier using BN256 pairing precompiles |
| `IGroth16Verifier.sol` | Interface for the verifier |

## Cadence Bridge

The transaction `cadence/transactions/verify_zk_via_evm.cdc` calls the Solidity verifier via a COA:

1. Borrows (or creates) a `CadenceOwnedAccount` from signer storage
2. ABI-encodes the proof parameters
3. Calls `Groth16Verifier.verifyProof()` on FlowEVM
4. Asserts the boolean result

## Deploy to FlowEVM Testnet

```bash
# Using Foundry (recommended)
forge create --rpc-url https://testnet.evm.nodes.onflow.org \
  --private-key $DEPLOYER_KEY \
  evm/contracts/Groth16Verifier.sol:Groth16Verifier

# Or using Hardhat
npx hardhat run scripts/deploy.js --network flowTestnet
```

## Client-Side Proof Generation

```javascript
import * as snarkjs from 'snarkjs';

// Generate a Groth16 proof
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  { secret: userSecret, complianceHash: hash },
  'circuits/compliance.wasm',
  'circuits/compliance_final.zkey'
);

// Format for Solidity verifier
const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
```

## BN256 Precompiles Used

| Address | Name | Purpose |
|---|---|---|
| `0x06` | ecAdd | Adds two G1 points on BN256 |
| `0x07` | ecMul | Scalar multiplication on G1 |
| `0x08` | ecPairing | Bilinear pairing check (the core of Groth16) |

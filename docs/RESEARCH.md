# FlowShield Technical Research — Answers to 14 Questions

Research compiled from Flow Developer Portal, Cadence Language Docs, and Flow EVM docs.

---

## ZK Proofs & Cryptography (Q1–Q3)

### Q1: Can Cadence natively verify ZK-SNARK or ZK-STARK proofs?

**No — not natively.** Cadence's built-in crypto primitives are limited to:
- **Hash algorithms**: SHA2-256, SHA2-384, SHA3-256, SHA3-384, KECCAK-256, KMAC128 (BLS)
- **Signature algorithms**: ECDSA_P256, ECDSA_secp256k1, BLS_BLS12_381
- **Signature verification**: `PublicKey.verify()` for ECDSA and BLS signatures
- **BLS multi-signature**: aggregation, PoP verification

There are **no elliptic curve pairing precompiles**, no Poseidon/Pedersen hash, and no generic ZK circuit verifier in Cadence.

**However**, FlowEVM is EVM-equivalent (post-Pectra). This means the standard Ethereum precompiles for BN256 pairing (`0x06`, `0x07`, `0x08`) are available on FlowEVM. ZK-SNARK verification (Groth16) works the same way it does on Ethereum.

**Architecture decision for FlowShield:**
- **Hybrid approach** — ZK verifier contract in Solidity on FlowEVM, credential system in Cadence
- OR **Simplified for hackathon** — Mock the ZK verification in Cadence (verify proof structure + trusted verifier signature), note that production would use FlowEVM for real ZK verification

**Recommended for hackathon**: Simplified mock verifier in Cadence. Real ZK on FlowEVM is complex to set up in limited time.

### Q2: What cryptographic primitives are available?

**In Cadence:**
- SHA2-256, SHA3-256, SHA2-384, SHA3-384, KECCAK-256
- ECDSA_P256, ECDSA_secp256k1 (sign/verify)
- BLS_BLS12_381 (sign/verify/aggregate)
- `PublicKey` struct with `verify()` method
- `HashAlgorithm` enum with `hash()` and `hashWithTag()`

**In FlowEVM (Ethereum precompiles):**
- ecRecover (0x01)
- SHA-256 (0x02)
- RIPEMD-160 (0x03)
- Identity (0x04)
- modexp (0x05)
- ecAdd, ecMul, ecPairing on BN256 (0x06, 0x07, 0x08) — **these enable ZK-SNARK verification**
- blake2f (0x09)
- Cadence Arch (0x0000...01) — Flow-specific, provides block height, VRF, COA ownership proof

### Q3: Any existing ZK work on Flow?

No major ZK-proof-on-Flow project found in the docs. This is **greenfield** — FlowShield can set the standard. For ZK libraries, `snarkjs` (Groth16) can generate proofs client-side, and a standard Solidity Groth16 verifier can run on FlowEVM.

---

## Flow Actions & Agents (Q4–Q7)

### Q4: Can we create a custom Flow Action type?

**Yes.** Flow Actions are struct-based interfaces. The 5 standard types are:
1. **Source** — provides tokens (withdraw, claim)
2. **Sink** — accepts tokens (deposit, repay)
3. **Swapper** — exchanges tokens
4. **PriceOracle** — price feeds
5. **Flasher** — flash loans

FlowShield's `ComplianceAction` wouldn't fit neatly into these 5 DeFi-focused types. **Best approach**: Create a compliance verification step that runs **before** the standard Flow Actions in a transaction. It's a pre-condition check, not a token action.

Pattern: In a Cadence transaction, check compliance first, then compose standard Flow Actions for the financial operation.

```
transaction {
  prepare(acct: ...) {
    // 1. Check compliance (our module)
    let isCompliant = ComplianceAction.verify(acct.address)
    assert(isCompliant, message: "Not compliant")

    // 2. Do the DeFi operation using standard Flow Actions
    let source = FungibleTokenConnectors.VaultSource(...)
    let sink = FungibleTokenConnectors.VaultSink(...)
    // ... compose as needed
  }
}
```

### Q5: What interfaces do Flow Actions implement?

Each Flow Action type is a **struct interface** with `IdentifiableStruct`:

- **Source**: `getSourceType() -> Type`, `minimumAvailable() -> UFix64`, `withdrawAvailable(maxAmount) -> @Vault`
- **Sink**: `getSinkType() -> Type`, `minimumCapacity() -> UFix64`, `depositCapacity(from: &Vault)`
- **Swapper**: exchanges between types
- **PriceOracle**: provides price data
- **Flasher**: flash loans with atomic repayment

**Connectors** bridge these interfaces to specific DeFi protocols. We'd create a "ComplianceConnector" or simply a standalone verification contract.

### Q6: How do Flow Agents interact with Scheduled Transactions?

**Scheduled Transactions** are first-class on Flow (Forte upgrade). Key details:

1. Define a contract with a resource implementing `FlowTransactionScheduler.TransactionHandler`
2. Implement `executeTransaction(id: UInt64, data: AnyStruct?)` — this is what runs on schedule
3. Store the handler resource in account storage, pass a capability to the scheduler
4. Call `FlowTransactionScheduler.schedule()` with: handler capability, future timestamp, execution effort, fees, optional data
5. The scheduler calls your handler's `executeTransaction()` at the specified time

**For FlowShield's Compliance Agent:**
- Create a `ComplianceMonitorHandler` resource implementing `TransactionHandler`
- `executeTransaction()` checks credential expiry for monitored addresses, emits events for expired ones
- Schedule recurring checks by having each execution schedule the next one

**Scheduler contracts on testnet:** `0x8c5303eaa26202d6`

### Q7: What are the gas/cost implications of Scheduled Transactions?

**Fee structure:**
- **Base execution fee**: based on computation effort (standard Flow fees)
- **Priority multiplier**: High (10x), Medium (5x), Low (2x)
- **Storage fee**: cost to store transaction data on-chain
- Fees are paid **upfront**, no refunds if execution costs less
- **Cancellation refund**: 50% of fees returned

**For compliance monitoring**: Use **Low Priority** (2x base) since compliance checks aren't time-critical. This is the cheapest option.

---

## Cadence Resources & Identity (Q8–Q10)

### Q8: Best pattern for Compliance Credential as a Cadence resource?

**Yes, store in user's account storage.** Other contracts check via **public capability**.

Pattern:
```
// In user's account:
// Storage: /storage/FlowShieldCredential
// Public:  /public/FlowShieldCredential (read-only capability)

// Any DeFi contract can check:
let credRef = getAccount(userAddress)
  .capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(/public/FlowShieldCredential)

if let cred = credRef {
  let isValid = cred.isValid() && !cred.isExpired()
}
```

No extra transaction needed from the user — any contract can read the public capability.

### Q9: Can a Cadence resource have expiration tied to block time?

**Yes.** Store an `expiresAt: UFix64` timestamp in the resource. The `isExpired()` function compares against `getCurrentBlock().timestamp`. Combined with Scheduled Transactions, you can trigger re-verification when credentials expire.

### Q10: Credential revocation?

**Pattern**: The `ComplianceCredential` contract has an `Admin` resource. The admin holds the authority to:
- Call `revoke(address)` which sets a `revoked: Bool` flag on the credential
- The public `isValid()` function checks `!revoked && !isExpired()`

For decentralization: use a **multi-sig admin** or governance contract rather than a single key.

---

## Cross-VM & Ecosystem Integration (Q11–Q14)

### Q11: Best pattern for Cadence ↔ FlowEVM communication?

**Cadence-Owned Accounts (COAs)** are the bridge:
- A Cadence resource can own and control an EVM address
- Cadence transactions can call EVM contracts via COA
- EVM contracts can call `Cadence Arch` precompile for limited Cadence queries

**Pattern for FlowShield hybrid architecture:**
1. Deploy ZK verifier as Solidity contract on FlowEVM
2. Create a COA in the FlowShield admin account
3. Cadence `ZKVerifier` contract calls the Solidity verifier via COA
4. On successful verification, mint Cadence `ComplianceCredential`

**For hackathon**: Skip this complexity. Use a simplified Cadence-only verifier.

### Q12: Are existing protocols using Flow Actions yet?

Flow Actions are part of the **Forte upgrade** (recent). Increment.fi, More.Markets, KittyPunch may or may not have adopted yet. This is early — FlowShield would be among the first compliance-focused Flow Actions integrations.

### Q13: Existing identity/credential standards on Flow?

**Greenfield.** No established identity or credential standard on Flow. FlowShield has the opportunity to **define the standard** for compliance credentials on Flow.

### Q14: Flow's stance on compliance tooling?

Flow's thesis is "the future of finance" — bringing millions of mainstream users on-chain. The Forte upgrade (Actions, Agents, Scheduled Transactions) is explicitly designed for financial infrastructure. Compliance tooling is clearly aligned with Flow's direction but no official compliance primitive exists yet.

---

## Anthropic API — Model Recommendation

### Pricing (per million tokens)

| Model | Input | Output | Speed | Best For |
|-------|-------|--------|-------|----------|
| **Haiku 4.5** | $1 | $5 | Fastest | High-volume, real-time chat, classification |
| **Sonnet 4.5** | $3 | $15 | Fast | Complex reasoning, coding, RAG |
| **Opus 4.5** | $5 | $25 | Slower | Flagship, research-grade |

### Recommendation for FlowShield

| Agent | Recommended Model | Reasoning |
|-------|-------------------|-----------|
| **Builder Copilot** | **Haiku 4.5** | Interactive chat needs fast responses. Haiku 4.5 is within 5% of Sonnet on most benchmarks, 5x cheaper, and much faster. Perfect for real-time copilot. |
| **Regulatory Radar** | **Haiku 4.5** | Parsing regulatory text into structured JSON is a classification/extraction task. Haiku handles this well. Switch to Sonnet only if output quality is insufficient. |

**Cost savings**: Haiku 4.5 at $1/$5 vs Sonnet 4.5 at $3/$15 = **67% cheaper on input, 67% cheaper on output**. For a hackathon with limited budget, Haiku 4.5 is the clear winner. Performance is near-Sonnet for these use cases.

**Model ID**: `claude-haiku-4-5-20250929`

> Note: Risk Scoring and Anomaly Monitor are rule-based (no LLM needed) per the project spec.

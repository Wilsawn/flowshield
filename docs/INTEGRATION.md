# Integrating FlowShield Into Your DeFi Protocol

## Quick Start (3 Steps)

### Step 1: Import FlowShield

```cadence
import ComplianceAction from 0xFLOWSHIELD_ADDRESS
```

### Step 2: Add Compliance Check

Add one line before any financial operation:

```cadence
if !ComplianceAction.verify(address: userAddress) {
    panic("User is not compliant")
}
```

### Step 3: That's It

Your protocol now requires FlowShield compliance. Users without a valid credential will be blocked. Users with a valid credential pass through with zero friction.

## Full Example: Compliant Lending Pool

```cadence
import ComplianceAction from 0xFLOWSHIELD_ADDRESS

access(all) contract MyLendingPool {

    access(all) fun deposit(from: Address, amount: UFix64) {
        // One line — FlowShield handles the rest
        if !ComplianceAction.verify(address: from) {
            panic("Compliance check failed. Cannot deposit.")
        }

        // Your normal deposit logic here
    }

    access(all) fun borrow(borrower: Address, amount: UFix64) {
        // Use verifyFull() for higher-risk operations
        if !ComplianceAction.verifyFull(address: borrower) {
            panic("Full compliance required for borrowing.")
        }

        // Your normal borrow logic here
    }
}
```

## Compliance Tiers

| Method | Required Tier | Use For |
|--------|--------------|---------|
| `ComplianceAction.verify()` | Compliant or Semi-compliant | Deposits, swaps, basic operations |
| `ComplianceAction.verifyFull()` | Compliant only | Borrowing, large transfers, high-risk operations |

## Checking Compliance Status (Scripts)

```cadence
import ComplianceCredential from 0xFLOWSHIELD_ADDRESS

access(all) fun main(address: Address): Bool {
    let account = getAccount(address)
    if let credentialRef = account.capabilities.borrow<&{ComplianceCredential.CredentialPublic}>(
        ComplianceCredential.CredentialPublicPath
    ) {
        return credentialRef.isValid()
    }
    return false
}
```

## Need Help?

Use the Builder Copilot API:

```bash
curl -X POST http://localhost:3001/api/copilot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I am building a lending pool for EU and US users. What compliance config do I need?"}'
```

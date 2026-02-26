# FlowShield Contract Addresses

## Testnet (Flow Testnet)

All contracts deployed to: **`0x93c691a98b975493`**

| Contract | Address | Description |
|---|---|---|
| ComplianceCredential | `0x93c691a98b975493` | Core credential resource — lives in user accounts |
| ZKVerifier | `0x93c691a98b975493` | ZK proof verification (simplified for hackathon) |
| ComplianceAction | `0x93c691a98b975493` | One-line compliance check for DeFi protocols |
| RuleEngine | `0x93c691a98b975493` | Jurisdiction rules (US, EU, UK, SG, CA) |
| DemoLendingPool | `0x93c691a98b975493` | Example DeFi integration with compliance |
| ComplianceAgent | `0x93c691a98b975493` | Autonomous monitoring agent |

### Verify on Block Explorers
- **FlowDiver:** https://www.flowdiver.io/account/93c691a98b975493?tab=deployments
- **Flowscan:** https://testnet.flowscan.io/account/0x93c691a98b975493

## Emulator
All contracts deploy to `emulator-account` (`0xf8d6e0586b0a20c7`).

```bash
flow emulator start
flow project deploy --network emulator
```

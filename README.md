# FlowShield

Privacy-preserving compliance infrastructure for DeFi on Flow.

## Project Structure
```
cadence/
  contracts/          - Cadence smart contracts
  scripts/            - Read-only blockchain queries
  transactions/       - State-changing operations
  tests/              - Contract tests
backend/
  agents/             - AI agents (risk scoring, copilot, radar, monitor)
  api/                - Express API server
    routes/           - API route handlers
  config/             - Rules and jurisdiction configs
frontend/
  src/
    components/       - React components
    hooks/            - Custom hooks
    pages/            - Page components
    utils/            - Utility functions
  public/             - Static assets
docs/                 - Architecture and integration docs
scripts/              - Deployment and setup scripts
```

## Flow Primitives

- Flow Actions
- Scheduled Transactions
- Flow Agents
- WebAuthn / Passkeys
- Cadence Resources
- Sponsored Transactions

## License

MIT

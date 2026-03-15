# Contributing to FlowShield

Thanks for your interest. Here’s how to get set up and where things live.

## Setup

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/Wilsawn/flowshield.git && cd flowshield
   npm install
   ```
2. Copy env files and add required keys:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
   See [docs/SETUP.md](docs/SETUP.md) for required variables (e.g. `ANTHROPIC_API_KEY`, Supabase).

3. Run locally:
   ```bash
   npm run dev
   ```
   Frontend: `http://localhost:5173` (or 3000). Backend: `http://localhost:3002`.

## Project layout

| Path | Purpose |
|------|--------|
| [frontend/](frontend/) | React 19 + Vite + Tailwind |
| [backend/](backend/) | Express API, agents, auth |
| [cadence/](cadence/) | Smart contracts, transactions, scripts |
| [evm/](evm/) | Solidity verifier + circom circuits |
| [docs/](docs/) | Architecture, setup, design, runbooks |

See [docs/README.md](docs/README.md) for a full doc index.

## Before submitting

- **Frontend:** Run `npm run build` in `frontend/` before pushing.
- **Backend:** No test suite yet; ensure the server starts and key routes respond if you change API.
- **UI:** Follow the design system — see [docs/DESIGN_ARCHITECTURE.md](docs/DESIGN_ARCHITECTURE.md).

## Issues and PRs

- **Bugs / features:** Open an issue.
- **PRs:** Keep changes scoped.

## Questions

Open a [GitHub Discussion](https://github.com/Wilsawn/flowshield/discussions) or an issue.

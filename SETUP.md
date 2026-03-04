# FlowShield — Production Setup Guide

Everything you need to go from localhost to a live product users can access.

---

## 1. Supabase (Persistent Database)

FlowShield uses Supabase for audit logs, scan history, API keys, webhooks, and regulatory requirements. Without it, everything works but resets on backend restart.

### Steps

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Name: `flowshield`, Region: pick closest to your users
3. Once created, go to **Settings → API** and copy:
   - `Project URL` → this is your `SUPABASE_URL`
   - `service_role` key → this is your `SUPABASE_SERVICE_KEY`
4. Go to **SQL Editor → New Query**, paste the contents of `backend/db/schema.sql`, and click **Run**
5. Then paste `backend/db/rls.sql` and run that too (enables Row Level Security)
6. Add to your root `.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key
```

That's it. The backend auto-connects on startup and logs `[Supabase] Connected to ...`.

---

## 2. Environment Variables

All env vars go in the **root** `.env` file (FlowShield reads from project root).

| Variable | Required | Description |
|---|---|---|
| `CONTRACT_ADDRESS` | Yes | `0x93c691a98b975493` (already deployed) |
| `FLOW_NETWORK` | Yes | `testnet` |
| `FLOW_PRIVATE_KEY` | Yes (hosted) | Deployer private key hex (without `0x` prefix). Not needed locally if `.pkey` file exists |
| `PORT` | Yes | `3001` (frontend dev server) |
| `BACKEND_PORT` | Yes | `3002` |
| `CLAUDE_API_KEY` | Yes | For Builder Copilot + Regulatory Radar AI enrichment |
| `VERIFF_API_KEY` | Recommended | For real KYC verification ([station.veriff.com](https://station.veriff.com)) |
| `VERIFF_SHARED_SECRET` | Recommended | Veriff webhook signing |
| `SUPABASE_URL` | Recommended | See section 1 |
| `SUPABASE_SERVICE_KEY` | Recommended | See section 1 |
| `STRIPE_SECRET_KEY` | Recommended | Stripe secret key for subscription checkout (test mode OK) |
| `STRIPE_GROWTH_PRICE_ID` | Optional | Stripe Price ID for Growth tier (auto-creates if not set) |
| `STRIPE_SCALE_PRICE_ID` | Optional | Stripe Price ID for Scale tier (auto-creates if not set) |
| `FRONTEND_URL` | Optional | Frontend URL for Stripe redirect (defaults to `http://localhost:5173`) |

**Private key**: For local dev, the file `flowshield-testnet2.pkey` at project root is used. For hosted deployments, set `FLOW_PRIVATE_KEY` env var instead.

---

## 3. Deploy Backend (Railway)

The backend is a Node.js Express server.

### Steps

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your repo, set root directory to `backend`
4. Add all env vars from section 2 in Railway's **Variables** tab
5. Also upload the private key content as an env var:
   ```
   FLOW_PRIVATE_KEY=<contents of flowshield-testnet2.pkey without 0x prefix>
   ```
   Then update `backend/api/routes/pool.js`, `governance.js`, `subscription.js`, `copilot.js` to read from `process.env.FLOW_PRIVATE_KEY` as a fallback when the `.pkey` file doesn't exist.
6. Set start command: `node api/server.js`
7. Railway gives you a URL like `https://flowshield-backend-production.up.railway.app`

### Alternative: Fly.io

```bash
cd backend
fly launch --name flowshield-api
fly secrets set CLAUDE_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
fly deploy
```

---

## 4. Deploy Frontend (Vercel)

The frontend is a Vite + React app.

### Steps

1. Go to [vercel.com](https://vercel.com) → **Import Project** from GitHub
2. Set root directory to `frontend`
3. Framework preset: **Vite**
4. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-backend-url.up.railway.app
   ```
5. Deploy

### Alternative: Netlify

```bash
cd frontend
npm run build
# Upload dist/ folder to Netlify, or connect GitHub repo
# Set VITE_API_URL in Netlify environment variables
```

---

## 5. Custom Domain + HTTPS

HTTPS is required for:
- **Veriff KYC** — callback URLs must be HTTPS
- **WebAuthn/Passkeys** — browser requires secure context
- **FCL Wallet Discovery** — some wallets require HTTPS

Both Vercel and Railway provide free HTTPS on their `.app` domains. For a custom domain:

1. Buy a domain (e.g., `flowshield.xyz`)
2. In Vercel: **Settings → Domains → Add** → follow DNS instructions
3. In Railway: **Settings → Networking → Custom Domain** → follow DNS instructions
4. Update `VITE_API_URL` to point to your backend's custom domain

---

## 6. Post-Deploy Checklist

- [ ] Backend responds at `/api/compliance/status/0x93c691a98b975493`
- [ ] Frontend loads and shows "Connect your wallet" prompt
- [ ] FCL wallet discovery opens when clicking "Connect Flow Wallet"
- [ ] After connecting, dashboard shows the user's real wallet balance
- [ ] Deposit/borrow transactions go through and appear on Flowscan
- [ ] Governance proposals can be created and appear on-chain
- [ ] Regulatory Radar scan returns real gap analysis
- [ ] Builder Copilot responds with Claude AI
- [ ] Supabase tables have audit log entries (if configured)

---

## Architecture: How User Flows Work

### Path A: Walletless Onboarding (email + passkey)
```
User enters email → passkey setup → backend creates a custodial Flow account
  (deployer funds it, keypair stored server-side in Supabase)
         ↓
KYC + ZK proof generated client-side → credential minted to user's NEW account
         ↓
Dashboard shows the user's custodial account data
```

### Path B: External Wallet (Lilico / Blocto / Dapper)
```
User clicks "Connect Flow Wallet" → FCL wallet discovery
         ↓
Dashboard queries: risk score, compliance status, pool position
  (all for the CONNECTED user's address)
         ↓
Onboarding → credential minted to the connected wallet address
```

### How It Works Under the Hood
- The server signs transactions using the deployer's private key (sponsoring gas)
- For walletless users: backend creates a real Flow account via `/api/accounts/create`, stores the mapping in Supabase
- For wallet users: the connected address is used directly
- Each user has their own pool position, compliance credential, and dashboard data on-chain
- All actions logged to Supabase audit trail

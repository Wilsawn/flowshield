# FlowShield — Setup Guide

Everything you need to go from localhost to a live deployment.

---

## 1. Supabase (Database)

FlowShield uses Supabase for user accounts, audit logs, and API keys. Without it, data resets on backend restart.

### Steps

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Name: `flowshield`, Region: pick closest to your users
3. Once created, go to **Settings → API** and copy:
   - `Project URL` → this is your `SUPABASE_URL`
   - `service_role` key → this is your `SUPABASE_SERVICE_KEY`
4. Go to **SQL Editor → New Query**, paste the contents of `backend/db/schema.sql`, and click **Run**
5. Then paste `backend/db/rls.sql` and run that too (enables Row Level Security)

---

## 2. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CONTRACT_ADDRESS` | Yes | `0x93c691a98b975493` (already deployed) |
| `FLOW_NETWORK` | Yes | `testnet` |
| `FLOW_PRIVATE_KEY` | Yes (hosted) | Deployer private key hex (without `0x` prefix) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Builder Copilot + AI agents |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `VERIFF_API_KEY` | Optional | For real KYC verification ([station.veriff.com](https://station.veriff.com)) |
| `VERIFF_SHARED_SECRET` | Optional | Veriff webhook signing |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key for subscription payments |
| `FRONTEND_URL` | Optional | Frontend URL for CORS (defaults to `http://localhost:5173`) |

---

## 3. Deploy Backend (Railway)

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your repo, set root directory to `backend`
4. Add all env vars from section 2 in Railway's **Variables** tab
5. Railway auto-detects Node.js and gives you a URL like `https://flowshield-production.up.railway.app`

---

## 4. Deploy Frontend (Netlify)

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Select your repo, set base directory to `frontend`
3. Build command: `npm run build`
4. Publish directory: `frontend/dist`
5. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-backend-url.up.railway.app
   ```
6. Deploy — Netlify auto-deploys on every push to `main`

---

## 5. Post-Deploy Checklist

- [ ] Backend responds at `/health` with `"supabase": "connected"`
- [ ] Frontend loads the landing page
- [ ] Passkey onboarding creates a Flow account
- [ ] Dashboard shows live testnet data
- [ ] Builder Copilot responds with AI (not fallback text)
- [ ] Deposit/borrow transactions confirm on-chain
- [ ] Governance proposals appear on Flowscan
- [ ] Regulatory Radar scan returns gap analysis

---

## Local Development

```bash
git clone https://github.com/Wilsawn/flowshield.git && cd flowshield
cp .env.example .env
cp backend/.env.example backend/.env
# Fill in your keys

npm install
npm run dev          # Runs both frontend + backend
```

Or separately:

```bash
npm run dev:frontend   # localhost:3000
npm run dev:backend    # localhost:3002
```

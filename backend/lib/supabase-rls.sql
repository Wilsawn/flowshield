-- FlowShield — Enable Row Level Security + Policies
-- Run this in Supabase SQL Editor AFTER creating the tables.
-- The service_role key bypasses RLS entirely, so your backend always works.
-- These policies protect against direct access via the anon key.

-- ── Enable RLS on all tables ──────────────────────────────────────────────────

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- ── audit_log: read-only for anon, service_role inserts via backend ───────────

CREATE POLICY "Allow public read on audit_log"
  ON audit_log FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on audit_log"
  ON audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── scan_history: read-only for anon ──────────────────────────────────────────

CREATE POLICY "Allow public read on scan_history"
  ON scan_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on scan_history"
  ON scan_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── regulatory_requirements: public read, service_role writes ─────────────────

CREATE POLICY "Allow public read on regulatory_requirements"
  ON regulatory_requirements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on regulatory_requirements"
  ON regulatory_requirements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── monitored_addresses: public read, service_role writes ─────────────────────

CREATE POLICY "Allow public read on monitored_addresses"
  ON monitored_addresses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on monitored_addresses"
  ON monitored_addresses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── webhooks: NO public access — sensitive data ───────────────────────────────

CREATE POLICY "Service role full access on webhooks"
  ON webhooks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── api_keys: NO public access — sensitive data ──────────────────────────────

CREATE POLICY "Service role full access on api_keys"
  ON api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── operators: public read, service_role writes ───────────────────────────────

CREATE POLICY "Allow public read on operators"
  ON operators FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on operators"
  ON operators FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

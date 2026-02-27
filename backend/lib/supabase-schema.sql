-- FlowShield Supabase Schema
-- Run this in your Supabase SQL Editor to create all tables.
-- https://supabase.com/dashboard → SQL Editor → New Query → Paste & Run

-- ── Audit Log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  agent TEXT NOT NULL,
  detail JSONB,
  severity TEXT DEFAULT 'info',
  operator_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_agent ON audit_log(agent);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ── Scan History ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_type TEXT NOT NULL,
  result JSONB NOT NULL,
  gaps_count INT DEFAULT 0,
  anomaly_count INT DEFAULT 0,
  risk_score INT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_type ON scan_history(scan_type);
CREATE INDEX IF NOT EXISTS idx_scan_history_created ON scan_history(created_at DESC);

-- ── Regulatory Requirements ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulatory_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  required_value TEXT NOT NULL,
  label TEXT,
  regulatory_basis TEXT,
  framework TEXT,
  regulator TEXT,
  effective_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(jurisdiction, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_requirements_jurisdiction ON regulatory_requirements(jurisdiction);

-- ── Monitored Addresses ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitored_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  label TEXT,
  operator_address TEXT,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Webhooks ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY['anomaly', 'gap', 'scan'],
  operator_address TEXT,
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── API Keys ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT,
  operator_address TEXT,
  permissions TEXT[] DEFAULT ARRAY['read', 'write'],
  enabled BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- ── Operators ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_address TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Run supabase-rls.sql after this file to enable RLS + policies on all tables.

-- ── Seed: Default regulatory requirements (mirrors COMPLIANCE_CHECKLIST) ─────
INSERT INTO regulatory_requirements (jurisdiction, rule_key, required_value, label, regulatory_basis, framework, regulator) VALUES
  ('US', 'kyc_required', 'true', 'KYC Required', 'FinCEN Travel Rule (31 CFR 1010.410)', 'Bank Secrecy Act (BSA)', 'FinCEN'),
  ('US', 'travel_rule_threshold', '3000.0', 'Travel Rule Threshold', 'FinCEN Travel Rule (31 CFR 1010.410)', 'Bank Secrecy Act (BSA)', 'FinCEN'),
  ('US', 'sanctions_screening', 'true', 'Sanctions Screening', 'OFAC SDN List (31 CFR 501)', 'Bank Secrecy Act (BSA)', 'OFAC'),
  ('US', 'risk_scoring_enabled', 'true', 'Risk Scoring', 'BSA/AML Risk Assessment (FFIEC)', 'Bank Secrecy Act (BSA)', 'FinCEN'),
  ('US', 'reverification_days', '365', 'Re-verification Period', 'CDD Rule (31 CFR 1010.230)', 'Bank Secrecy Act (BSA)', 'FinCEN'),
  ('US', 'pep_screening', 'true', 'PEP Screening', 'Enhanced Due Diligence (31 CFR 1010.620)', 'Bank Secrecy Act (BSA)', 'FinCEN'),
  ('EU', 'kyc_required', 'true', 'KYC Required', 'MiCA Article 68 (KYC)', 'MiCA (Markets in Crypto-Assets)', 'EBA / ESMA'),
  ('EU', 'travel_rule_threshold', '1000.0', 'Travel Rule Threshold', 'EU Transfer of Funds Regulation (EU 2023/1113)', 'MiCA (Markets in Crypto-Assets)', 'EBA / ESMA'),
  ('EU', 'sanctions_screening', 'true', 'Sanctions Screening', 'EU AML Directive 5 (AMLD5)', 'MiCA (Markets in Crypto-Assets)', 'EBA / ESMA'),
  ('EU', 'risk_scoring_enabled', 'true', 'Risk Scoring', 'MiCA Article 79', 'MiCA (Markets in Crypto-Assets)', 'EBA / ESMA'),
  ('EU', 'reverification_days', '365', 'Re-verification Period', 'MiCA Article 68 (ongoing due diligence)', 'MiCA (Markets in Crypto-Assets)', 'EBA / ESMA'),
  ('EU', 'pep_screening', 'true', 'PEP Screening', 'AMLD5 Article 20', 'MiCA (Markets in Crypto-Assets)', 'EBA / ESMA'),
  ('UK', 'kyc_required', 'true', 'KYC Required', 'FCA MLR 2017 Part 2', 'FCA Crypto-asset Rules', 'FCA'),
  ('UK', 'travel_rule_threshold', '1000.0', 'Travel Rule Threshold', 'UK Travel Rule (MLR 2017 Reg 71A)', 'FCA Crypto-asset Rules', 'FCA'),
  ('UK', 'sanctions_screening', 'true', 'Sanctions Screening', 'UK Sanctions Act 2018', 'FCA Crypto-asset Rules', 'OFSI'),
  ('UK', 'risk_scoring_enabled', 'true', 'Risk Scoring', 'FCA MLR Guidance 6.3', 'FCA Crypto-asset Rules', 'FCA'),
  ('UK', 'reverification_days', '365', 'Re-verification Period', 'FCA Guidance on CDD (FG17/6)', 'FCA Crypto-asset Rules', 'FCA'),
  ('UK', 'pep_screening', 'true', 'PEP Screening', 'MLR 2017 Reg 35', 'FCA Crypto-asset Rules', 'FCA'),
  ('SG', 'kyc_required', 'true', 'KYC Required', 'MAS Notice PSN02', 'Payment Services Act (PSA)', 'MAS'),
  ('SG', 'travel_rule_threshold', '1500.0', 'Travel Rule Threshold', 'MAS Notice PSN02 Para 13', 'Payment Services Act (PSA)', 'MAS'),
  ('SG', 'sanctions_screening', 'true', 'Sanctions Screening', 'MAS Sanctions Framework', 'Payment Services Act (PSA)', 'MAS'),
  ('SG', 'risk_scoring_enabled', 'true', 'Risk Scoring', 'MAS Guidelines on AML/CFT 7.2', 'Payment Services Act (PSA)', 'MAS'),
  ('SG', 'reverification_days', '365', 'Re-verification Period', 'MAS Notice PSN02 Para 10', 'Payment Services Act (PSA)', 'MAS'),
  ('SG', 'pep_screening', 'true', 'PEP Screening', 'MAS Notice PSN02 Para 14', 'Payment Services Act (PSA)', 'MAS'),
  ('CA', 'kyc_required', 'true', 'KYC Required', 'FINTRAC MSB Guidelines', 'PCMLTFA', 'FINTRAC'),
  ('CA', 'travel_rule_threshold', '1000.0', 'Travel Rule Threshold', 'PCMLTFA Section 9.5', 'PCMLTFA', 'FINTRAC'),
  ('CA', 'sanctions_screening', 'true', 'Sanctions Screening', 'Criminal Code Part II.1', 'PCMLTFA', 'FINTRAC'),
  ('CA', 'risk_scoring_enabled', 'true', 'Risk Scoring', 'FINTRAC Risk Assessment Guidance', 'PCMLTFA', 'FINTRAC'),
  ('CA', 'reverification_days', '365', 'Re-verification Period', 'PCMLTFA Section 9.6 (ongoing monitoring)', 'PCMLTFA', 'FINTRAC'),
  ('CA', 'pep_screening', 'true', 'PEP Screening', 'PCMLTFA Section 9.3 (PEP/HIO)', 'PCMLTFA', 'FINTRAC')
ON CONFLICT (jurisdiction, rule_key) DO NOTHING;

-- ── Seed: Default monitored address ──────────────────────────────────────────
INSERT INTO monitored_addresses (address, label) VALUES
  ('0x93c691a98b975493', 'FlowShield Contract')
ON CONFLICT (address) DO NOTHING;

/**
 * @file Supabase Client
 * @module lib/supabase
 * @description Persistent database layer for FlowShield backend.
 *              Manages audit trail, scan history, regulatory requirements,
 *              operator profiles, webhook configuration, and API key validation.
 */

import { createClient } from '@supabase/supabase-js'

let supabase = null

/**
 * Get the Supabase client instance (lazy initialization).
 * Reads env vars at call time (not import time) so dotenv has loaded them.
 * Returns null if SUPABASE_URL is not configured — all callers
 * gracefully degrade when Supabase is unavailable.
 */
export function getSupabase() {
  if (supabase) return supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    return null
  }
  supabase = createClient(url, key)
  console.log('[Supabase] Connected to', url)
  return supabase
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

/**
 * Log a compliance action to the audit trail.
 * Silently no-ops if Supabase is not configured.
 */
export async function logAudit({ action, agent, detail, severity, operatorAddress }) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    const { data, error } = await sb.from('audit_log').insert({
      action,
      agent,
      detail: typeof detail === 'string' ? { message: detail } : detail,
      severity: severity || 'info',
      operator_address: operatorAddress || null,
    }).select().single()

    if (error) {
      console.warn('[Supabase] Audit log error:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('[Supabase] Audit log failed:', err.message)
    return null
  }
}

/**
 * Get recent audit log entries.
 */
export async function getAuditLog({ limit = 50, agent, operatorAddress } = {}) {
  const sb = getSupabase()
  if (!sb) return []

  try {
    let query = sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit)
    if (agent) query = query.eq('agent', agent)
    if (operatorAddress) query = query.eq('operator_address', operatorAddress)

    const { data, error } = await query
    if (error) {
      console.warn('[Supabase] Audit log fetch error:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('[Supabase] Audit log fetch failed:', err.message)
    return []
  }
}

// ── Scan History ──────────────────────────────────────────────────────────────

/**
 * Store a compliance scan result.
 */
export async function storeScanResult({ scanType, result, gapsCount, anomalyCount, riskScore, source }) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    const { data, error } = await sb.from('scan_history').insert({
      scan_type: scanType,
      result,
      gaps_count: gapsCount || 0,
      anomaly_count: anomalyCount || 0,
      risk_score: riskScore || null,
      source: source || null,
    }).select().single()

    if (error) {
      console.warn('[Supabase] Scan history error:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('[Supabase] Scan history failed:', err.message)
    return null
  }
}

/**
 * Get recent scan history.
 */
export async function getScanHistory({ limit = 20, scanType } = {}) {
  const sb = getSupabase()
  if (!sb) return []

  try {
    let query = sb.from('scan_history').select('*').order('created_at', { ascending: false }).limit(limit)
    if (scanType) query = query.eq('scan_type', scanType)

    const { data, error } = await query
    if (error) {
      console.warn('[Supabase] Scan history fetch error:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('[Supabase] Scan history fetch failed:', err.message)
    return []
  }
}

// ── Regulatory Requirements ───────────────────────────────────────────────────

/**
 * Get all regulatory requirements, optionally filtered by jurisdiction.
 * Falls back to null if Supabase is unavailable (caller uses hardcoded checklist).
 */
export async function getRegulatoryRequirements(jurisdiction) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    let query = sb.from('regulatory_requirements').select('*')
    if (jurisdiction) query = query.eq('jurisdiction', jurisdiction)

    const { data, error } = await query
    if (error) {
      console.warn('[Supabase] Regulatory requirements error:', error.message)
      return null
    }
    return data || []
  } catch (err) {
    console.warn('[Supabase] Regulatory requirements failed:', err.message)
    return null
  }
}

/**
 * Upsert a regulatory requirement.
 */
export async function upsertRequirement({ jurisdiction, ruleKey, requiredValue, label, regulatoryBasis, framework, regulator }) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    const { data, error } = await sb.from('regulatory_requirements').upsert({
      jurisdiction,
      rule_key: ruleKey,
      required_value: requiredValue,
      label: label || null,
      regulatory_basis: regulatoryBasis || null,
      framework: framework || null,
      regulator: regulator || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'jurisdiction,rule_key' }).select().single()

    if (error) {
      console.warn('[Supabase] Requirement upsert error:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('[Supabase] Requirement upsert failed:', err.message)
    return null
  }
}

// ── Monitored Addresses ───────────────────────────────────────────────────────

/**
 * Get all monitored addresses for an operator.
 */
export async function getMonitoredAddresses(operatorAddress) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    let query = sb.from('monitored_addresses').select('*').order('created_at', { ascending: false })
    if (operatorAddress) query = query.eq('operator_address', operatorAddress)

    const { data, error } = await query
    if (error) {
      console.warn('[Supabase] Monitored addresses error:', error.message)
      return null
    }
    return data || []
  } catch (err) {
    console.warn('[Supabase] Monitored addresses failed:', err.message)
    return null
  }
}

/**
 * Add an address to monitor.
 */
export async function addMonitoredAddress({ address, label, operatorAddress }) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    const { data, error } = await sb.from('monitored_addresses').upsert({
      address,
      label: label || null,
      operator_address: operatorAddress || null,
    }, { onConflict: 'address' }).select().single()

    if (error) {
      console.warn('[Supabase] Add monitored address error:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('[Supabase] Add monitored address failed:', err.message)
    return null
  }
}

/**
 * Remove a monitored address.
 */
export async function removeMonitoredAddress(address) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    const { error } = await sb.from('monitored_addresses').delete().eq('address', address)
    if (error) {
      console.warn('[Supabase] Remove address error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Supabase] Remove address failed:', err.message)
    return false
  }
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

/**
 * Get all registered webhooks.
 */
export async function getWebhooks(operatorAddress) {
  const sb = getSupabase()
  if (!sb) return []

  try {
    let query = sb.from('webhooks').select('*').eq('enabled', true)
    if (operatorAddress) query = query.eq('operator_address', operatorAddress)

    const { data, error } = await query
    if (error) {
      console.warn('[Supabase] Webhooks fetch error:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('[Supabase] Webhooks fetch failed:', err.message)
    return []
  }
}

/**
 * Register a webhook.
 */
export async function registerWebhook({ url, events, operatorAddress, secret }) {
  const sb = getSupabase()
  if (!sb) return null

  try {
    const { data, error } = await sb.from('webhooks').insert({
      url,
      events: events || ['anomaly', 'gap', 'scan'],
      operator_address: operatorAddress || null,
      secret: secret || null,
      enabled: true,
    }).select().single()

    if (error) {
      console.warn('[Supabase] Webhook register error:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('[Supabase] Webhook register failed:', err.message)
    return null
  }
}

// ── Webhook Dispatcher ────────────────────────────────────────────────────────

/**
 * Fire webhooks for a given event type.
 * Non-blocking — failures are logged but don't break the caller.
 */
export async function fireWebhooks(eventType, payload) {
  const webhooks = await getWebhooks()
  if (!webhooks.length) return

  const relevant = webhooks.filter(w => w.events?.includes(eventType) || w.events?.includes('*'))

  for (const webhook of relevant) {
    try {
      const body = JSON.stringify({
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload,
      })

      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-FlowShield-Secret': webhook.secret } : {}),
        },
        body,
      }).catch(err => {
        console.warn(`[Webhook] Failed to deliver to ${webhook.url}:`, err.message)
      })
    } catch (err) {
      console.warn(`[Webhook] Error firing to ${webhook.url}:`, err.message)
    }
  }
}

// ── API Keys ──────────────────────────────────────────────────────────────────

/**
 * Validate an API key.
 */
export async function validateApiKey(apiKey) {
  const sb = getSupabase()
  if (!sb) return null // No Supabase = no key validation = allow all (dev mode)

  try {
    const { data, error } = await sb
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('enabled', true)
      .single()

    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

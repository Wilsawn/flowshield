/**
 * @file UI Utilities
 * @module lib/utils
 * @description Shared utility functions for className merging (cn), authenticated fetch,
 *              and other common helpers used across the FlowShield frontend.
 */
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Returns auth headers for authenticated API calls.
 * Reads session token from localStorage.
 */
export function authHeaders() {
  const token = localStorage.getItem('flowshield_token')
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * Authenticated fetch wrapper — adds Bearer token and AbortController timeout.
 * @param {string} url
 * @param {object} options - fetch options + optional `timeout` (ms, default 15000)
 */
export async function authFetch(url, options = {}) {
  const { timeout = 15000, ...fetchOpts } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const headers = {
      ...fetchOpts.headers,
      ...authHeaders(),
    }
    return await fetch(url, { ...fetchOpts, headers, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch with timeout (no auth). For public endpoints.
 */
export async function fetchWithTimeout(url, options = {}) {
  const { timeout = 15000, ...fetchOpts } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    return await fetch(url, { ...fetchOpts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

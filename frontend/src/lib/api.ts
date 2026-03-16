/**
 * @file API Configuration
 * @module lib/api
 * @description Centralized API base URL for all backend requests.
 *              Uses VITE_API_URL env var in production (Railway), falls back to localhost:3002 in dev.
 *              Production builds must set VITE_API_URL or API calls will use same origin (e.g. proxy).
 */
export const API = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:3002' : (typeof window !== 'undefined' ? window.location.origin : ''))

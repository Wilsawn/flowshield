// lib/api.js
// Centralized API base URL. Falls back to localhost in development only.

export const API = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:3002' : '')

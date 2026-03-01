// lib/supabase.js
// Frontend Supabase client for data access.
// Uses the ANON key (safe for browser). Service key stays on the backend only.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null

export function getSupabase() {
  if (supabase) return supabase
  if (!supabaseUrl || !supabaseAnonKey) return null
  supabase = createClient(supabaseUrl, supabaseAnonKey)
  return supabase
}

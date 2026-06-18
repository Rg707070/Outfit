import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'

/**
 * Service-role Supabase client for offline/admin scripts (e.g. catalog ingestion).
 *
 * Uses the SERVICE ROLE key, which BYPASSES Row Level Security. It must NEVER be
 * imported into the Next.js app/browser bundle — keep it under scripts/ only and
 * never prefix the key with NEXT_PUBLIC_.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (server-only secret)')
}

export const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const SUPABASE_URL = url
export const SERVICE_ROLE_KEY = serviceRoleKey
export const CATALOG_BUCKET = 'catalog'

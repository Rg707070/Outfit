import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Catalog search endpoint.
 *
 * Runs the hybrid `search_catalog_items` RPC. Currently lexical-only (FTS +
 * trigram); `query_embedding` is intentionally omitted so Postgres uses its
 * default (NULL) and the semantic branch is skipped. Semantic search can be
 * enabled later by embedding `q` (e.g. via the `embed` Edge Function) and
 * passing `query_embedding` — no other change required here.
 */
export async function POST(request: NextRequest) {
  let body: { q?: unknown; category?: unknown; limit?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ items: [] })
  }

  const query = typeof body.q === 'string' ? body.q.trim() : ''
  if (!query) return NextResponse.json({ items: [] })

  const category =
    typeof body.category === 'string' && body.category && body.category !== 'all'
      ? body.category
      : null
  const limit = typeof body.limit === 'number' && body.limit > 0 ? Math.min(body.limit, 48) : 24

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_catalog_items', {
    query_text: query,
    match_count: limit,
    category_filter: category,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ items: data ?? [] })
}

import { NextRequest, NextResponse } from 'next/server'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY

// Server-side in-memory cache — avoids hammering the Unsplash API
const cache = new Map<string, { data: unknown; exp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// Maps app categories to Unsplash search terms
const CATEGORY_QUERIES: Record<string, string> = {
  all: 'fashion clothing style outfit',
  tops: 'shirt blouse top fashion clothing',
  bottoms: 'pants jeans trousers skirt fashion',
  dresses: 'dress gown fashion style',
  outerwear: 'jacket coat blazer fashion',
  shoes: 'shoes sneakers boots heels fashion',
  accessories: 'fashion accessories jewelry belt hat scarf',
  bags: 'handbag purse tote bag fashion',
  underwear: 'underwear lingerie fashion',
  activewear: 'activewear sportswear gym clothes',
  other: 'fashion clothing style',
}

export async function GET(req: NextRequest) {
  if (!UNSPLASH_KEY) {
    return NextResponse.json({ error: 'API_KEY_MISSING' }, { status: 503 })
  }

  const sp = req.nextUrl.searchParams
  const query = sp.get('q') || ''
  const category = sp.get('category') || 'all'
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10))

  const baseQuery = query.trim()
    ? `${query} fashion clothing`
    : (CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all)

  const cacheKey = `${baseQuery}:${page}`
  const hit = cache.get(cacheKey)
  if (hit && hit.exp > Date.now()) {
    return NextResponse.json(hit.data, { headers: { 'X-Cache': 'HIT' } })
  }

  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', baseQuery)
  url.searchParams.set('per_page', '20')
  url.searchParams.set('page', String(page))
  url.searchParams.set('orientation', 'portrait')
  url.searchParams.set('content_filter', 'high')

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    })
  } catch {
    return NextResponse.json({ error: 'UPSTREAM_UNREACHABLE' }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'UPSTREAM_ERROR', status: res.status }, { status: res.status })
  }

  const raw = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (raw.results ?? []).map((p: any) => ({
    id: p.id,
    name: p.alt_description || p.description || baseQuery,
    imageUrl: p.urls.small,
    thumbnailUrl: p.urls.thumb,
    downloadLocation: p.links.download_location,
    attribution: p.user?.name ?? 'Unsplash',
    attributionUrl: `https://unsplash.com/@${p.user?.username ?? ''}?utm_source=outfit_app&utm_medium=referral`,
  }))

  const data = {
    items,
    total: raw.total ?? 0,
    hasMore: page < (raw.total_pages ?? 1),
    page,
  }

  cache.set(cacheKey, { data, exp: Date.now() + CACHE_TTL })

  // Prune stale entries to avoid memory growth
  if (cache.size > 200) {
    const now = Date.now()
    for (const [k, v] of cache) {
      if (v.exp < now) cache.delete(k)
    }
  }

  return NextResponse.json(data)
}

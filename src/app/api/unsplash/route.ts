import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json([], { status: 400 })

  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return NextResponse.json({ error: 'Missing UNSPLASH_ACCESS_KEY' }, { status: 500 })

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=24&orientation=squarish`,
    { headers: { Authorization: `Client-ID ${key}` } }
  )

  if (!res.ok) return NextResponse.json({ error: 'Unsplash error' }, { status: 502 })

  const data = await res.json()
  const photos = data.results.map((p: any) => ({
    id: p.id,
    thumb: p.urls.small,
    full: p.urls.regular,
    alt: p.alt_description ?? '',
  }))

  return NextResponse.json(photos)
}

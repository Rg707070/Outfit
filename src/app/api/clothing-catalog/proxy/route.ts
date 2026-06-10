import { NextRequest, NextResponse } from 'next/server'

// Allowed CDN hostnames — only proxy images from these domains
const ALLOWED_HOSTS = new Set([
  'images.unsplash.com',
  'plus.unsplash.com',
])

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(parsed.toString())
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 })
  }

  const blob = await upstream.arrayBuffer()
  const contentType = upstream.headers.get('Content-Type') || 'image/jpeg'

  return new NextResponse(blob, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}

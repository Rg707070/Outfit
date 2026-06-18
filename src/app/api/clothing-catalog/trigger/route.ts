import { NextRequest, NextResponse } from 'next/server'

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY

// Unsplash API guidelines require calling this endpoint whenever a user
// saves/downloads a photo. This registers the download with Unsplash so
// photographers receive credit. Skipping this can result in API access revocation.
export async function POST(req: NextRequest) {
  if (!UNSPLASH_KEY) {
    return NextResponse.json({ error: 'API_KEY_MISSING' }, { status: 503 })
  }

  const { downloadLocation } = await req.json()
  if (!downloadLocation || typeof downloadLocation !== 'string') {
    return NextResponse.json({ error: 'Missing downloadLocation' }, { status: 400 })
  }

  // Only allow calls to the official Unsplash API endpoint
  let parsed: URL
  try {
    parsed = new URL(downloadLocation)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (parsed.hostname !== 'api.unsplash.com') {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
  }

  try {
    await fetch(parsed.toString(), {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    })
  } catch {
    // Non-fatal — log but don't block the user's import
    console.error('[unsplash] download trigger failed:', downloadLocation)
  }

  return NextResponse.json({ ok: true })
}

// Auto-tagging edge function.
//
// Context: uploading a wardrobe item used to mean typing the name, category,
// brand and colour by hand — high friction. This function takes the photo the
// user just selected (their own image, so no third-party rights concerns) and
// uses Claude vision to suggest those fields, which the client pre-fills into
// the Add-Item form. Every field stays editable; this is a suggestion layer.
//
// The ANTHROPIC_API_KEY lives only here (server-side), never in the client.
// Deploy with: supabase functions deploy auto-tag
// Set the key with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// We call the Messages API over plain HTTP (rather than the SDK) so the
// function is fully self-contained and has no npm/Deno version coupling.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CATEGORIES = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes',
  'accessories', 'bags', 'underwear', 'activewear', 'other',
] as const

// Structured-output schema — guarantees parseable, constrained results.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Short descriptive name in Hebrew, e.g. "חולצת פשתן לבנה"' },
    category: { type: 'string', enum: CATEGORIES as unknown as string[] },
    primary_color_hex: { type: 'string', description: 'Dominant colour as #RRGGBB hex' },
    colors: { type: 'array', items: { type: 'string' }, description: 'Colour names in Hebrew' },
    material: { type: 'string', description: 'Best-guess material in Hebrew, or "" if unclear' },
    brand: { type: 'string', description: 'Visible brand name, or "" if none visible' },
    tags: { type: 'array', items: { type: 'string' }, description: '2-5 descriptive Hebrew tags (style, pattern, fit, season)' },
  },
  required: ['name', 'category', 'primary_color_hex', 'colors', 'material', 'brand', 'tags'],
}

const PROMPT = `You are tagging a single clothing item for a Hebrew-first digital wardrobe app.
Look at the photo and identify the garment. Respond in Hebrew for human-readable fields
(name, colors, material, tags). Pick the single best-fit category from the allowed list.
If the brand is not clearly visible, return "" — never guess a brand. Keep the name short
(2-4 words). Tags should describe style, pattern, fit, or season — not repeat the category.`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500)

    const { imageBase64, mediaType } = await req.json()
    if (!imageBase64 || !MEDIA_TYPES.includes(mediaType)) {
      return json({ error: 'imageBase64 and a valid mediaType are required' }, 400)
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        // Simple, fast classification — low effort, constrained JSON output.
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: SCHEMA },
        },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('anthropic error', res.status, detail)
      return json({ error: `Anthropic API error (${res.status})` }, 502)
    }

    const data = await res.json()
    const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === 'text')
    if (!textBlock?.text) return json({ error: 'No structured output returned' }, 502)

    const tags = JSON.parse(textBlock.text)
    // Defend against the model returning an off-list category.
    if (!CATEGORIES.includes(tags.category)) tags.category = 'other'

    return json(tags, 200)
  } catch (err) {
    console.error('auto-tag error', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

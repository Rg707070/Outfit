/**
 * Catalog ingestion pipeline ("סקריפט החליבה").
 *
 * Takes an array of source items (name, description, image URL, …), downloads
 * each image, stores a clean copy in OUR Supabase Storage (the `catalog` bucket),
 * and upserts a fully-typed row into public.catalog_items pointing at the stored
 * image. This gives us full data ownership — at runtime the app never depends on
 * the original external image hosts.
 *
 * Run:
 *   npm run ingest                 # uses the built-in SAMPLE_ITEMS below
 *   npm run ingest -- ./items.json # ingests a JSON array of IngestItemInput
 *
 * Requires (loaded from .env via dotenv):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional semantic embeddings (off by default — see CLAUDE notes / README):
 *   ENABLE_EMBEDDINGS=true   # POSTs text to the `embed` Edge Function per item
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { admin, CATALOG_BUCKET, SUPABASE_URL, SERVICE_ROLE_KEY } from './lib/admin-client'
import type { Database, ClothingCategory, Season } from '../src/types/database'

type CatalogInsert = Database['public']['Tables']['catalog_items']['Insert']

/** Strict shape of one source item handed to the pipeline. */
export type IngestItemInput = {
  name: string
  description?: string
  category: ClothingCategory
  imageUrl: string
  brand?: string
  color?: string
  gender?: 'women' | 'men' | 'unisex'
  subcategory?: string
  seasons?: Season[]
  tags?: string[]
  price?: number
  currency?: string
  /** Provenance + idempotency. (sourceName, externalRef) is unique. */
  sourceName: string
  externalRef: string
}

type IngestResult =
  | { ok: true; externalRef: string; action: 'inserted' }
  | { ok: false; externalRef: string; error: string }

const CONCURRENCY = 5
const MAX_RETRIES = 4

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === MAX_RETRIES) break
      const backoff = 2 ** attempt * 500
      console.warn(`  ↻ ${label} failed (attempt ${attempt + 1}), retrying in ${backoff}ms…`)
      await sleep(backoff)
    }
  }
  throw lastErr
}

/**
 * Background-removal hook. `@imgly/background-removal` is a browser/WASM package
 * and is NOT reliable under Node, so by default we pass the image through
 * unchanged and expect the source images to already be clean (no background).
 * Swap this implementation for an Edge Function / headless step if needed (a real
 * implementation will likely also want the source contentType).
 */
async function cleanImage(buffer: Uint8Array): Promise<Uint8Array> {
  return buffer
}

async function fetchImage(url: string): Promise<{ data: Uint8Array; ext: string; contentType: string }> {
  return withRetry(async () => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching image`)
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim() || 'image/png'
    const ext = CONTENT_TYPE_EXT[contentType] ?? 'png'
    const data = new Uint8Array(await res.arrayBuffer())
    if (data.byteLength === 0) throw new Error('Empty image body')
    return { data, ext, contentType }
  }, `download ${url}`)
}

/** Optional: compute a 384-dim embedding via the `embed` Edge Function. */
async function embedText(text: string): Promise<number[] | null> {
  if (process.env.ENABLE_EMBEDDINGS !== 'true') return null
  return withRetry(async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/embed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text, type: 'passage' }),
    })
    if (!res.ok) throw new Error(`embed HTTP ${res.status}: ${await res.text()}`)
    const json = (await res.json()) as { embeddings: number[][] }
    return json.embeddings?.[0] ?? null
  }, 'embed')
}

async function ingestOne(item: IngestItemInput): Promise<IngestResult> {
  try {
    const { data, ext, contentType } = await fetchImage(item.imageUrl)
    const cleaned = await cleanImage(data)

    const imagePath = `items/${item.sourceName}/${item.externalRef}.${ext}`
    await withRetry(async () => {
      const { error } = await admin.storage
        .from(CATALOG_BUCKET)
        .upload(imagePath, cleaned, { contentType, upsert: true })
      if (error) throw error
    }, `upload ${imagePath}`)

    const { data: pub } = admin.storage.from(CATALOG_BUCKET).getPublicUrl(imagePath)

    const embedding = await embedText(`${item.name}. ${item.description ?? ''}`.trim())

    const row: CatalogInsert = {
      name: item.name,
      description: item.description ?? null,
      category: item.category,
      subcategory: item.subcategory ?? null,
      brand: item.brand ?? null,
      color: item.color ?? null,
      gender: item.gender ?? null,
      seasons: item.seasons ?? [],
      tags: item.tags ?? [],
      price: item.price ?? null,
      currency: item.currency ?? 'ILS',
      image_path: imagePath,
      image_url: pub.publicUrl,
      source_name: item.sourceName,
      source_url: item.imageUrl,
      external_ref: item.externalRef,
      embedding: embedding ? JSON.stringify(embedding) : null,
      is_active: true,
    }

    await withRetry(async () => {
      const { error } = await admin
        .from('catalog_items')
        .upsert(row, { onConflict: 'source_name,external_ref' })
      if (error) throw error
    }, `upsert ${item.externalRef}`)

    return { ok: true, externalRef: item.externalRef, action: 'inserted' }
  } catch (err) {
    return {
      ok: false,
      externalRef: item.externalRef,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function runPool(items: IngestItemInput[]): Promise<IngestResult[]> {
  const results: IngestResult[] = []
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      const item = items[index]
      console.log(`[${index + 1}/${items.length}] ${item.name} (${item.externalRef})`)
      results.push(await ingestOne(item))
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  return results
}

function validate(items: unknown): IngestItemInput[] {
  if (!Array.isArray(items)) throw new Error('Input must be a JSON array of items')
  return items.map((raw, i) => {
    const it = raw as Partial<IngestItemInput>
    if (!it.name || !it.category || !it.imageUrl || !it.sourceName || !it.externalRef) {
      throw new Error(`Item #${i} missing required field (name/category/imageUrl/sourceName/externalRef)`)
    }
    return it as IngestItemInput
  })
}

/** A tiny, replaceable demo dataset so the script is runnable out of the box. */
const SAMPLE_ITEMS: IngestItemInput[] = [
  {
    name: 'שמלת מקסי שחורה',
    description: 'שמלת ערב מקסי שחורה אלגנטית עם שסע, מתאימה לאירועים',
    category: 'dresses',
    color: 'שחור',
    gender: 'women',
    seasons: ['autumn', 'winter'],
    tags: ['ערב', 'אלגנטי', 'מקסי'],
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
    sourceName: 'demo',
    externalRef: 'demo-dress-black-maxi',
  },
  {
    name: "ג'ינס סקיני כחול",
    description: "מכנסי ג'ינס סקיני בגזרה גבוהה בצבע כחול כהה",
    category: 'bottoms',
    color: 'כחול',
    gender: 'women',
    seasons: ['all'],
    tags: ['ג׳ינס', 'יומיומי'],
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
    sourceName: 'demo',
    externalRef: 'demo-jeans-skinny-blue',
  },
  {
    name: 'חולצת טי לבנה בייסיק',
    description: 'חולצת טישרט כותנה לבנה קלאסית עם צווארון עגול',
    category: 'tops',
    color: 'לבן',
    gender: 'unisex',
    seasons: ['spring', 'summer'],
    tags: ['בייסיק', 'כותנה'],
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    sourceName: 'demo',
    externalRef: 'demo-tee-white-basic',
  },
]

async function main() {
  const fileArg = process.argv[2]
  let items: IngestItemInput[]
  if (fileArg) {
    const text = await readFile(fileArg, 'utf8')
    items = validate(JSON.parse(text))
    console.log(`Loaded ${items.length} item(s) from ${fileArg}`)
  } else {
    items = SAMPLE_ITEMS
    console.log(`No file argument — ingesting ${items.length} built-in sample item(s)`)
  }

  const results = await runPool(items)
  const ok = results.filter((r) => r.ok)
  const failed = results.filter((r): r is Extract<IngestResult, { ok: false }> => !r.ok)

  console.log(`\n✓ ${ok.length} ingested, ✗ ${failed.length} failed`)
  for (const f of failed) console.error(`  ✗ ${f.externalRef}: ${f.error}`)
  if (failed.length > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClothingCategory } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, ExternalLink, Plus, RotateCcw } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

interface CatalogItem {
  id: string
  name: string
  imageUrl: string
  thumbnailUrl: string
  downloadLocation: string
  attribution: string
  attributionUrl: string
}

interface Props {
  category: ClothingCategory | 'all'
  search: string
  onImported: () => void
}

export function CatalogBrowser({ category, search, onImported }: Props) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<'API_KEY_MISSING' | 'FETCH_ERROR' | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [importModal, setImportModal] = useState<CatalogItem | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const fetchKey = useRef('')
  const currentPage = useRef(1)
  const { t } = useLang()

  const fetchItems = useCallback(async (cat: string, q: string, pg: number, append: boolean) => {
    if (pg === 1) setLoading(true)
    else setLoadingMore(true)
    setError(null)

    const params = new URLSearchParams({ category: cat, page: String(pg) })
    if (q) params.set('q', q)

    try {
      const res = await fetch(`/api/clothing-catalog?${params}`)
      if (!res.ok) {
        setError(res.status === 503 ? 'API_KEY_MISSING' : 'FETCH_ERROR')
        return
      }
      const data = await res.json()
      if (data.error === 'API_KEY_MISSING') { setError('API_KEY_MISSING'); return }
      setItems(prev => append ? [...prev, ...data.items] : data.items)
      setHasMore(data.hasMore)
      currentPage.current = pg
      setPage(pg)
    } catch {
      setError('FETCH_ERROR')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Debounce + reset on category/search change
  useEffect(() => {
    const key = `${category}|${search}`
    if (key === fetchKey.current) return
    fetchKey.current = key
    const tid = setTimeout(() => fetchItems(category, search, 1, false), 300)
    return () => clearTimeout(tid)
  }, [category, search, fetchItems])

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        fetchItems(category, search, currentPage.current + 1, true)
      }
    }, { rootMargin: '300px' })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loading, category, search, fetchItems])

  async function importItem(item: CatalogItem, name: string, cat: ClothingCategory, brand: string) {
    setImportingId(item.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch image via our proxy (avoids CORS issues)
      const imgRes = await fetch(`/api/clothing-catalog/proxy?url=${encodeURIComponent(item.imageUrl)}`)
      if (!imgRes.ok) throw new Error('Image fetch failed')
      const blob = await imgRes.blob()

      // Upload to the user's Supabase Storage bucket (same bucket as manual uploads)
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('wardrobe')
        .upload(path, blob, { contentType: blob.type || 'image/jpeg' })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('wardrobe').getPublicUrl(path)

      await supabase.from('wardrobe_items').insert({
        user_id: user.id,
        name,
        category: cat,
        brand: brand || null,
        image_url: urlData.publicUrl,
      })

      setImportedIds(prev => new Set([...prev, item.id]))
      onImported()
    } catch (e) {
      console.error('Import failed:', e)
    } finally {
      setImportingId(null)
      setImportModal(null)
    }
  }

  // ── Error states ──────────────────────────────────────────────
  if (error === 'API_KEY_MISSING') {
    return (
      <div className="text-center py-20 max-w-sm mx-auto">
        <span className="text-5xl">🔑</span>
        <p className="text-gray-900 mt-4 text-lg font-semibold">
          {t.catalog.apiKeyMissing}
        </p>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          {t.catalog.apiKeyMissingSub}
        </p>
        <div className="mt-4 bg-gray-50 rounded-xl p-4 text-left text-xs font-mono text-gray-600">
          <p className="text-gray-400 mb-1"># .env.local</p>
          <p>UNSPLASH_ACCESS_KEY=your_key_here</p>
        </div>
        <a
          href="https://unsplash.com/developers"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-sm text-blue-600 hover:text-blue-700 underline"
        >
          {t.catalog.getKeyLink}
          <ExternalLink size={12} />
        </a>
      </div>
    )
  }

  if (error === 'FETCH_ERROR') {
    return (
      <div className="text-center py-20">
        <span className="text-4xl">⚠️</span>
        <p className="text-gray-500 mt-3 font-medium">{t.catalog.fetchError}</p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => { fetchKey.current = ''; fetchItems(category, search, 1, false) }}
        >
          <RotateCcw size={14} />
          {t.catalog.retry}
        </Button>
      </div>
    )
  }

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <SkeletonGrid count={20} />
    )
  }

  // ── Empty ─────────────────────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <div className="text-center py-20">
        <span className="text-4xl">🔍</span>
        <p className="text-gray-500 mt-3 font-medium">{t.catalog.noResults}</p>
      </div>
    )
  }

  // ── Main grid ─────────────────────────────────────────────────
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map(item => {
          const isImported = importedIds.has(item.id)
          const isImporting = importingId === item.id
          return (
            <div
              key={item.id}
              className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-50 relative overflow-hidden">
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                {/* Add button — always visible on mobile, hover on desktop */}
                {!isImported ? (
                  <button
                    onClick={() => setImportModal(item)}
                    disabled={isImporting}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 disabled:opacity-50"
                    title={t.catalog.addToWardrobe}
                  >
                    {isImporting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                  </button>
                ) : (
                  <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg">
                    <Check size={14} />
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate capitalize">{item.name}</p>
                <a
                  href={item.attributionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 truncate flex items-center gap-0.5 hover:text-gray-600 transition-colors"
                >
                  {t.catalog.photoBy} {item.attribution}
                  <ExternalLink size={9} className="flex-shrink-0" />
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sentinel for IntersectionObserver — triggers next page load */}
      <div ref={sentinelRef} className="h-4 mt-4" />

      {loadingMore && <SkeletonGrid count={10} className="mt-4" />}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-6">{t.catalog.endOfResults}</p>
      )}

      <p className="text-center text-xs text-gray-300 mt-2">
        {t.catalog.poweredBy}{' '}
        <a
          href="https://unsplash.com?utm_source=outfit_app&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Unsplash
        </a>
      </p>

      {/* Import confirmation modal */}
      {importModal && (
        <ImportModal
          item={importModal}
          defaultCategory={category === 'all' ? 'tops' : category}
          t={t}
          onConfirm={(name, cat, brand) => importItem(importModal, name, cat, brand)}
          onClose={() => setImportModal(null)}
        />
      )}
    </>
  )
}

// ── Skeleton grid ─────────────────────────────────────────────────────────────
function SkeletonGrid({ count, className = '' }: { count: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-gray-100">
          <div className="aspect-square bg-gray-100 animate-pulse" />
          <div className="p-3 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Import modal ──────────────────────────────────────────────────────────────
function ImportModal({
  item,
  defaultCategory,
  t,
  onConfirm,
  onClose,
}: {
  item: CatalogItem
  defaultCategory: ClothingCategory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
  onConfirm: (name: string, category: ClothingCategory, brand: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(capitalize(item.name))
  const [category, setCategory] = useState<ClothingCategory>(defaultCategory)
  const [brand, setBrand] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    onConfirm(name, category, brand)
    // Modal will be closed by parent after import completes
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold">{t.catalog.importTitle}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {/* Preview */}
          <div className="flex gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
            />
            <div className="min-w-0 flex flex-col justify-center">
              <p className="text-sm font-medium text-gray-900 truncate capitalize">{item.name}</p>
              <a
                href={item.attributionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5 mt-0.5"
              >
                {t.catalog.photoBy} {item.attribution}
                <ExternalLink size={9} />
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.wardrobe.nameLabel}
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.wardrobe.namePlaceholder}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.wardrobe.categoryLabel}
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ClothingCategory)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                {CLOTHING_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {t.categories[c.value as keyof typeof t.categories] ?? c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.wardrobe.brandLabel}
              </label>
              <Input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder={t.wardrobe.brandPlaceholder}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                {t.wardrobe.cancel}
              </Button>
              <Button type="submit" disabled={saving || !name} className="flex-1">
                {saving ? t.catalog.addingToWardrobe : t.catalog.addToWardrobe}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

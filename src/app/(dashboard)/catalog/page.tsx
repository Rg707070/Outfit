'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'
import { CatalogCard } from '@/components/look-builder/catalog-card'
import { CatalogQuickLook } from '@/components/look-builder/catalog-quick-look'
import type { CatalogItem, ClothingCategory } from '@/types/database'

const PAGE = 30

function chip(active: boolean) {
  return `text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
    active ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
  }`
}

export default function CatalogPage() {
  const { t } = useLang()
  const [supabase] = useState(() => createClient())
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ClothingCategory | 'all'>('all')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<CatalogItem | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef(0)

  // Reset + load the first page whenever the query or category changes.
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const q = query.trim()

    const run = async () => {
      setLoading(true)
      setItems([])
      pageRef.current = 0
      try {
        if (!q) {
          // Browse: newest active items, paginated for infinite scroll.
          let req = supabase
            .from('catalog_items')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .range(0, PAGE - 1)
          if (category !== 'all') req = req.eq('category', category)
          const { data } = await req
          if (!cancelled) {
            setItems(data ?? [])
            setHasMore((data?.length ?? 0) === PAGE)
          }
        } else {
          // Search: hybrid RPC via the route handler (single ranked page).
          const res = await fetch('/api/catalog/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q, category, limit: 48 }),
            signal: controller.signal,
          })
          const json = (await res.json()) as { items?: CatalogItem[] }
          if (!cancelled) {
            setItems(json.items ?? [])
            setHasMore(false)
          }
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== 'AbortError') setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const tmr = setTimeout(run, q ? 300 : 0)
    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(tmr)
    }
  }, [query, category, supabase])

  const loadMore = useCallback(async () => {
    if (query.trim() || loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = pageRef.current + 1
    let req = supabase
      .from('catalog_items')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(next * PAGE, next * PAGE + PAGE - 1)
    if (category !== 'all') req = req.eq('category', category)
    const { data } = await req
    pageRef.current = next
    setItems((prev) => [...prev, ...(data ?? [])])
    setHasMore((data?.length ?? 0) === PAGE)
    setLoadingMore(false)
  }, [query, category, hasMore, loadingMore, supabase])

  // Infinite-scroll sentinel (browse mode only). Re-attaches when the sentinel
  // mounts after the initial load finishes.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore, loading, hasMore, query])

  return (
    <div className="pb-10">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{t.catalog.title}</h1>
        <div className="relative mb-3 max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.catalog.searchPlaceholder}
            className="w-full rounded-xl border border-gray-200 bg-white pr-10 pl-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setCategory('all')} className={chip(category === 'all')}>
            {t.catalog.all}
          </button>
          {CLOTHING_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value as ClothingCategory)}
              className={chip(category === c.value)}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 py-20">
          {query.trim() ? t.catalog.noResults : t.catalog.empty}
        </p>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {items.map((item) => (
            <CatalogCard key={item.id} item={item} onOpen={setSelected} />
          ))}
        </div>
      )}

      {!query.trim() && hasMore && !loading && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8 text-gray-400">
          {loadingMore && <Loader2 size={20} className="animate-spin" />}
        </div>
      )}

      <CatalogQuickLook item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

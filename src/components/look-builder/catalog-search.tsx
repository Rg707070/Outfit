'use client'
import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import type { CatalogItem, ClothingCategory } from '@/types/database'

function getCatEmoji(cat: string) {
  return CLOTHING_CATEGORIES.find((c) => c.value === cat)?.emoji ?? '👗'
}

/** Identifier shared with the canvas droppable so dropped catalog items are recognised. */
export const CATALOG_DRAG_PREFIX = 'catalog:'

function ResultCard({ item, onAdd }: { item: CatalogItem; onAdd: (item: CatalogItem) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${CATALOG_DRAG_PREFIX}${item.id}`,
    data: { kind: 'catalog', item },
  })

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(item)}
      className={`aspect-square bg-gray-50 rounded-xl overflow-hidden hover:ring-2 hover:ring-black transition-all group relative text-right ${isDragging ? 'opacity-40' : ''}`}
      title={`${item.name}${item.brand ? ' · ' + item.brand : ''}`}
      style={{ touchAction: 'none' }}
    >
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-2xl">{getCatEmoji(item.category)}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
        <Plus size={20} className="text-white" />
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pt-3 pb-1 text-[10px] text-white truncate text-right pointer-events-none">
        {item.name}
      </div>
    </button>
  )
}

export function CatalogSearch({ onAdd }: { onAdd: (item: CatalogItem) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ClothingCategory | 'all'>('all')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const q = query.trim()

    const run = async () => {
      setLoading(true)
      try {
        if (!q) {
          // Default browse: most-recent active catalog items (optionally by category).
          let req = supabase
            .from('catalog_items')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(24)
          if (category !== 'all') req = req.eq('category', category)
          const { data } = await req
          if (!cancelled) setItems(data ?? [])
        } else {
          // Free-text search via the hybrid RPC route handler.
          const res = await fetch('/api/catalog/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q, category }),
            signal: controller.signal,
          })
          const json = (await res.json()) as { items?: CatalogItem[] }
          if (!cancelled) setItems(json.items ?? [])
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== 'AbortError') setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const t = setTimeout(run, q ? 300 : 0)
    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(t)
    }
  }, [query, category, supabase])

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-gray-100 flex-shrink-0 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש חופשי במאגר…"
            className="w-full rounded-lg border border-gray-200 bg-white pr-8 pl-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          <button
            onClick={() => setCategory('all')}
            className={`text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${category === 'all' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            הכל
          </button>
          {CLOTHING_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value as ClothingCategory)}
              className={`text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${category === cat.value ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            {query.trim() ? 'לא נמצאו פריטים תואמים' : 'אין פריטים במאגר עדיין'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <ResultCard key={item.id} item={item} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

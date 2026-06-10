'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ExternalLink, Plus } from 'lucide-react'
import { CLOTHING_CATEGORIES, SEASONS } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'
import { Button } from '@/components/ui/button'
import { formatPrice } from './catalog-card'
import type { CatalogItem } from '@/types/database'

/**
 * Quick-look modal for a catalog item — large uncropped image + metadata, a link
 * to the source, and a primary "add to look" action that deep-links into the
 * Look Builder (`/outfits/new?add=<id>`). Closes on backdrop / ✕ / Escape.
 */
export function CatalogQuickLook({ item, onClose }: { item: CatalogItem | null; onClose: () => void }) {
  const router = useRouter()
  const { t } = useLang()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!item) return null

  const price = formatPrice(item.price, item.currency)
  const cat = CLOTHING_CATEGORIES.find((c) => c.value === item.category)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:w-1/2 bg-gray-50 flex items-center justify-center p-4 max-h-[45vh] md:max-h-none">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain rounded-xl" />
          ) : (
            <span className="text-7xl">{cat?.emoji ?? '👗'}</span>
          )}
        </div>

        <div className="md:w-1/2 p-6 flex flex-col overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0"
              aria-label="סגור"
            >
              <X size={18} />
            </button>
          </div>

          {item.brand && <p className="text-gray-500 mt-1">{item.brand}</p>}
          {price && <p className="text-2xl font-semibold text-gray-900 mt-3">{price}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            {cat && (
              <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                {cat.emoji} {cat.label}
              </span>
            )}
            {item.color && (
              <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{item.color}</span>
            )}
            {(item.seasons ?? []).map((s) => {
              const sl = SEASONS.find((x) => x.value === s)
              return sl ? (
                <span key={s} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  {sl.emoji} {sl.label}
                </span>
              ) : null
            })}
          </div>

          {item.description && (
            <p className="text-gray-600 text-sm mt-4 leading-relaxed">{item.description}</p>
          )}

          {(item.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-4">
              {item.tags.map((tag) => (
                <span key={tag} className="text-xs text-gray-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-6 space-y-2">
            <Button onClick={() => router.push(`/outfits/new?add=${item.id}`)} className="w-full">
              <Plus size={16} />
              {t.catalog.addToLook}
            </Button>
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-500 hover:text-gray-900 py-2 transition-colors"
              >
                <ExternalLink size={14} />
                {t.catalog.viewSource}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

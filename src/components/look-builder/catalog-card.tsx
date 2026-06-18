'use client'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import type { CatalogItem } from '@/types/database'

function getCatEmoji(cat: string) {
  return CLOTHING_CATEGORIES.find((c) => c.value === cat)?.emoji ?? '👗'
}

/** Format a catalog price for display (₪ for ILS, otherwise "<amount> <currency>"). */
export function formatPrice(price: number | null, currency: string | null) {
  if (price == null) return null
  return (currency ?? 'ILS') === 'ILS' ? `₪${price}` : `${price} ${currency}`
}

/**
 * A single masonry tile. The image renders at its natural aspect ratio
 * (`h-auto`) so the CSS-columns layout produces varied heights (Pinterest feel).
 * Clicking opens the quick-look modal via `onOpen`.
 */
export function CatalogCard({ item, onOpen }: { item: CatalogItem; onOpen: (item: CatalogItem) => void }) {
  const price = formatPrice(item.price, item.currency)
  return (
    <button
      onClick={() => onOpen(item)}
      className="mb-4 w-full block break-inside-avoid group relative overflow-hidden rounded-2xl bg-gray-50 text-right focus:outline-none focus:ring-2 focus:ring-black"
    >
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-auto block" />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center">
          <span className="text-5xl">{getCatEmoji(item.category)}</span>
        </div>
      )}

      {price && (
        <span className="absolute top-2 right-2 bg-white/90 backdrop-blur text-gray-900 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
          {price}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-sm font-medium truncate">{item.name}</p>
        {item.brand && <p className="text-white/70 text-xs truncate">{item.brand}</p>}
      </div>
    </button>
  )
}

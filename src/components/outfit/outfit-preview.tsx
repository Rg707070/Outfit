'use client'
import { useState } from 'react'
import { LayoutGrid, PersonStanding } from 'lucide-react'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'
import { cn } from '@/lib/utils'

export interface PreviewItem {
  id: string
  name: string
  category: string
  image_url: string | null
  brand?: string | null
}

type Mode = 'flat' | 'model'

function emojiFor(category: string) {
  return CLOTHING_CATEGORIES.find(c => c.value === category)?.emoji ?? '👗'
}

// Body zones mapped over a 3:4 figure (percent-based, top→bottom).
// `side` zones float to the edge so bags don't cover the body.
const ZONES: { id: string; cats: string[]; top: number; height: number; z: number; side?: boolean }[] = [
  { id: 'head', cats: ['accessories'], top: 1, height: 15, z: 3 },
  { id: 'dress', cats: ['dresses'], top: 18, height: 50, z: 1 },
  { id: 'torso', cats: ['tops', 'outerwear', 'activewear', 'underwear', 'other'], top: 18, height: 32, z: 2 },
  { id: 'legs', cats: ['bottoms'], top: 50, height: 33, z: 2 },
  { id: 'feet', cats: ['shoes'], top: 84, height: 15, z: 3 },
  { id: 'bag', cats: ['bags'], top: 46, height: 22, z: 4, side: true },
]

function Figure() {
  // Faint neutral silhouette rendered behind the garments.
  return (
    <svg
      viewBox="0 0 100 133"
      className="absolute inset-0 h-full w-full text-gray-200"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <g fill="currentColor">
        <circle cx="50" cy="14" r="9" />
        <path d="M38 24 q12 -5 24 0 l6 22 -8 4 -1 34 q-9 4 -18 0 l-1 -34 -8 -4 z" />
        <rect x="42" y="84" width="7" height="38" rx="3" />
        <rect x="51" y="84" width="7" height="38" rx="3" />
      </g>
    </svg>
  )
}

function ItemImage({ item, className }: { item: PreviewItem; className?: string }) {
  if (item.image_url) {
    return (
      <img
        src={item.image_url}
        alt={item.name}
        className={cn('h-full w-full object-contain drop-shadow-md', className)}
        draggable={false}
      />
    )
  }
  return (
    <div className={cn('flex h-full w-full items-center justify-center', className)}>
      <span className="text-4xl opacity-80">{emojiFor(item.category)}</span>
    </div>
  )
}

function OnModel({ items }: { items: PreviewItem[] }) {
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
      <Figure />
      {ZONES.map(zone => {
        const zoneItems = items.filter(i => zone.cats.includes(i.category))
        if (zoneItems.length === 0) return null
        return (
          <div
            key={zone.id}
            className={cn(
              'absolute flex items-center justify-center gap-1',
              zone.side ? 'w-[26%]' : 'inset-x-0',
            )}
            style={{
              top: `${zone.top}%`,
              height: `${zone.height}%`,
              zIndex: zone.z,
              ...(zone.side ? { insetInlineEnd: '0%' } : {}),
            }}
          >
            {zoneItems.map(item => (
              <div key={item.id} className="h-full min-w-0 flex-1" style={{ maxWidth: zone.side ? '100%' : '60%' }}>
                <ItemImage item={item} />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function FlatLay({ items }: { items: PreviewItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map(item => (
        <div key={item.id} className="overflow-hidden rounded-2xl bg-gray-50">
          <div className="flex aspect-square items-center justify-center p-2">
            <ItemImage item={item} />
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
            {item.brand && <p className="truncate text-xs text-gray-400">{item.brand}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function OutfitPreview({
  items,
  defaultMode = 'flat',
}: {
  items: PreviewItem[]
  defaultMode?: Mode
}) {
  const { t } = useLang()
  const [mode, setMode] = useState<Mode>(defaultMode)

  if (items.length === 0) {
    return <p className="py-8 text-center text-gray-400">{t.preview.empty}</p>
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          {t.preview.items(items.length)}
        </span>
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setMode('flat')}
            aria-pressed={mode === 'flat'}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              mode === 'flat' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <LayoutGrid size={15} />
            {t.preview.flatLay}
          </button>
          <button
            type="button"
            onClick={() => setMode('model')}
            aria-pressed={mode === 'model'}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              mode === 'model' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <PersonStanding size={15} />
            {t.preview.onModel}
          </button>
        </div>
      </div>

      {mode === 'flat' ? <FlatLay items={items} /> : <OnModel items={items} />}
    </div>
  )
}

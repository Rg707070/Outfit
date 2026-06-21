'use client'
import { useState } from 'react'
import { WardrobeItem } from '@/types/database'

type BodyType = 'female' | 'male'

interface MannequinViewProps {
  items: WardrobeItem[]
}

// Maps clothing categories to body zones
function getCategoryZone(category: string): {
  top: number; left: number; width: number; height: number; zIndex: number
} | null {
  switch (category) {
    case 'outerwear':
      return { top: 17, left: 18, width: 64, height: 38, zIndex: 5 }
    case 'tops':
      return { top: 20, left: 22, width: 56, height: 30, zIndex: 4 }
    case 'dresses':
      return { top: 20, left: 18, width: 64, height: 58, zIndex: 4 }
    case 'bottoms':
      return { top: 48, left: 22, width: 56, height: 38, zIndex: 3 }
    case 'shoes':
      return { top: 84, left: 18, width: 64, height: 14, zIndex: 3 }
    case 'accessories':
      return { top: 10, left: 30, width: 40, height: 14, zIndex: 6 }
    case 'bags':
      return { top: 38, left: 72, width: 22, height: 26, zIndex: 6 }
    case 'underwear':
      return { top: 46, left: 26, width: 48, height: 22, zIndex: 2 }
    case 'activewear':
      return { top: 20, left: 20, width: 60, height: 52, zIndex: 4 }
    default:
      return null
  }
}

function FemaleSilhouette() {
  return (
    <svg viewBox="0 0 200 520" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Head */}
      <ellipse cx="100" cy="40" rx="28" ry="34" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Neck */}
      <rect x="88" y="70" width="24" height="22" rx="4" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Shoulders & Torso */}
      <path d="M40 100 Q60 88 100 90 Q140 88 160 100 L155 200 Q145 220 130 228 Q115 234 100 235 Q85 234 70 228 Q55 220 45 200 Z" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Arms */}
      <path d="M40 100 Q28 120 24 160 Q22 185 28 210 Q32 220 38 215 Q44 190 46 165 Q50 135 55 115" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      <path d="M160 100 Q172 120 176 160 Q178 185 172 210 Q168 220 162 215 Q156 190 154 165 Q150 135 145 115" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Hips */}
      <path d="M45 200 Q38 230 40 260 L45 290 Q60 310 100 312 Q140 310 155 290 L160 260 Q162 230 155 200 Q145 220 130 228 Q115 234 100 235 Q85 234 70 228 Q55 220 45 200 Z" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Legs */}
      <path d="M45 290 Q42 360 46 420 Q48 450 52 480 Q58 500 68 500 Q76 500 78 490 Q80 470 80 450 L82 370 L86 290" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      <path d="M155 290 Q158 360 154 420 Q152 450 148 480 Q142 500 132 500 Q124 500 122 490 Q120 470 120 450 L118 370 L114 290" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Feet */}
      <ellipse cx="64" cy="504" rx="18" ry="10" fill="#d4c4b8" stroke="#c9b8a8" strokeWidth="1.5"/>
      <ellipse cx="136" cy="504" rx="18" ry="10" fill="#d4c4b8" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Face details */}
      <ellipse cx="91" cy="38" rx="3" ry="3.5" fill="#8a7060"/>
      <ellipse cx="109" cy="38" rx="3" ry="3.5" fill="#8a7060"/>
      <path d="M93 52 Q100 57 107 52" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Hair */}
      <path d="M72 20 Q75 5 100 3 Q125 5 128 20 Q130 32 128 38 Q118 8 100 8 Q82 8 72 38 Q70 32 72 20Z" fill="#6b4f3a"/>
      <path d="M72 38 Q68 55 70 72" stroke="#6b4f3a" strokeWidth="6" strokeLinecap="round"/>
      <path d="M128 38 Q132 55 130 72" stroke="#6b4f3a" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  )
}

function MaleSilhouette() {
  return (
    <svg viewBox="0 0 200 520" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Head */}
      <ellipse cx="100" cy="38" rx="30" ry="34" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Neck */}
      <rect x="86" y="68" width="28" height="22" rx="3" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Shoulders & Torso - broader */}
      <path d="M30 98 Q55 85 100 88 Q145 85 170 98 L162 210 Q148 225 125 230 Q112 232 100 232 Q88 232 75 230 Q52 225 38 210 Z" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Arms - thicker */}
      <path d="M30 98 Q16 122 14 165 Q12 192 20 215 Q25 226 33 220 Q40 195 42 168 Q46 138 55 112" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      <path d="M170 98 Q184 122 186 165 Q188 192 180 215 Q175 226 167 220 Q160 195 158 168 Q154 138 145 112" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Hips - straighter */}
      <path d="M38 210 Q35 240 38 265 L42 292 Q58 305 100 306 Q142 305 158 292 L162 265 Q165 240 162 210 Q148 225 125 230 Q112 232 100 232 Q88 232 75 230 Q52 225 38 210 Z" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Legs */}
      <path d="M42 292 Q38 360 42 420 Q44 452 48 480 Q54 500 65 500 Q74 500 76 488 Q78 468 78 448 L80 365 L88 292" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      <path d="M158 292 Q162 360 158 420 Q156 452 152 480 Q146 500 135 500 Q126 500 124 488 Q122 468 122 448 L120 365 L112 292" fill="#e8ddd4" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Feet */}
      <ellipse cx="63" cy="504" rx="20" ry="10" fill="#d4c4b8" stroke="#c9b8a8" strokeWidth="1.5"/>
      <ellipse cx="137" cy="504" rx="20" ry="10" fill="#d4c4b8" stroke="#c9b8a8" strokeWidth="1.5"/>
      {/* Face details */}
      <ellipse cx="90" cy="36" rx="3.5" ry="3.5" fill="#8a7060"/>
      <ellipse cx="110" cy="36" rx="3.5" ry="3.5" fill="#8a7060"/>
      <path d="M92 50 Q100 55 108 50" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Hair */}
      <path d="M70 18 Q75 4 100 2 Q125 4 130 18 Q132 30 130 38 Q120 6 100 6 Q80 6 70 38 Q68 30 70 18Z" fill="#4a3828"/>
    </svg>
  )
}

export function MannequinView({ items }: MannequinViewProps) {
  const [bodyType, setBodyType] = useState<BodyType>('female')

  // Deduplicate by category — for each category, pick the first item
  const itemsByCategory = new Map<string, WardrobeItem>()
  for (const item of items) {
    if (!itemsByCategory.has(item.category)) {
      itemsByCategory.set(item.category, item)
    }
  }

  const categorized = Array.from(itemsByCategory.entries())
    .map(([cat, item]) => ({ item, zone: getCategoryZone(cat) }))
    .filter(x => x.zone !== null)
    .sort((a, b) => (a.zone!.zIndex - b.zone!.zIndex))

  const hasItems = categorized.length > 0

  return (
    <div className="flex flex-col items-center h-full gap-3">
      {/* Body type toggle */}
      <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 flex-shrink-0">
        <button
          onClick={() => setBodyType('female')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${bodyType === 'female' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          אישה
        </button>
        <button
          onClick={() => setBodyType('male')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${bodyType === 'male' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          גבר
        </button>
      </div>

      {/* Mannequin container */}
      <div className="relative flex-1 flex items-center justify-center w-full">
        <div className="relative h-full" style={{ maxHeight: '480px', aspectRatio: '200/520' }}>
          {/* Silhouette */}
          <div className="absolute inset-0">
            {bodyType === 'female' ? <FemaleSilhouette /> : <MaleSilhouette />}
          </div>

          {/* Clothing overlays */}
          {hasItems && categorized.map(({ item, zone }) => (
            zone && item.image_url ? (
              <div
                key={item.id}
                className="absolute"
                style={{
                  top: `${zone.top}%`,
                  left: `${zone.left}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  zIndex: zone.zIndex,
                }}
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-contain drop-shadow-sm"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </div>
            ) : zone && !item.image_url ? (
              <div
                key={item.id}
                className="absolute flex items-center justify-center"
                style={{
                  top: `${zone.top}%`,
                  left: `${zone.left}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  zIndex: zone.zIndex,
                  backgroundColor: 'rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                }}
              >
                <span className="text-xs text-stone-500 text-center px-1 leading-tight">{item.name}</span>
              </div>
            ) : null
          ))}

          {!hasItems && (
            <div className="absolute inset-0 flex items-end justify-center pb-4">
              <p className="text-xs text-stone-400 bg-white/80 rounded-lg px-3 py-1.5 text-center">
                הוסף פריטים כדי לראות אותם על הדמות
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {hasItems && (
        <div className="flex flex-wrap gap-2 justify-center flex-shrink-0 pb-1">
          {categorized.map(({ item }) => (
            <span key={item.id} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
              {item.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

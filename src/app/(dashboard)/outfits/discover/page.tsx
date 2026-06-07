'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { X, Heart, Calendar, ArrowRight, RefreshCw, Shuffle } from 'lucide-react'
import Link from 'next/link'

type Combo = { id: string; items: WardrobeItem[] }

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined
}

function generateCombos(items: WardrobeItem[]): Combo[] {
  const by = (cat: string) => items.filter(i => i.category === cat)
  const uid = () => Math.random().toString(36).slice(2)

  const tops = by('tops')
  const bottoms = by('bottoms')
  const dresses = by('dresses')
  const shoes = by('shoes')
  const outerwear = by('outerwear')
  const accessories = by('accessories')
  const bags = by('bags')
  const activewear = by('activewear')

  const combos: Combo[] = []

  for (const top of shuffle(tops).slice(0, 8)) {
    for (const bottom of shuffle(bottoms).slice(0, 4)) {
      const combo: WardrobeItem[] = [top, bottom]
      const shoe = pick(shoes)
      if (shoe) combo.push(shoe)
      if (Math.random() > 0.5) { const ow = pick(outerwear); if (ow) combo.push(ow) }
      if (Math.random() > 0.6) { const acc = pick(accessories); if (acc) combo.push(acc) }
      combos.push({ id: `${top.id}-${bottom.id}-${uid()}`, items: combo })
    }
  }

  for (const dress of dresses) {
    const combo: WardrobeItem[] = [dress]
    const shoe = pick(shoes)
    if (shoe) combo.push(shoe)
    if (Math.random() > 0.4) { const acc = pick(accessories); if (acc) combo.push(acc) }
    if (Math.random() > 0.6) { const bag = pick(bags); if (bag) combo.push(bag) }
    combos.push({ id: `${dress.id}-${uid()}`, items: combo })
  }

  for (const active of activewear) {
    const combo: WardrobeItem[] = [active]
    const shoe = pick(shoes)
    if (shoe) combo.push(shoe)
    combos.push({ id: `${active.id}-${uid()}`, items: combo })
  }

  return shuffle(combos).slice(0, 40)
}

function getComboName(items: WardrobeItem[]): string {
  const cats = items.map(i => i.category)
  if (cats.includes('dresses')) return 'לוק שמלה'
  if (cats.includes('activewear')) return 'לוק ספורטיבי'
  if (cats.includes('outerwear') && cats.includes('tops')) return 'לוק שכבות'
  if (cats.includes('accessories')) return 'לוק מסוגנן'
  return 'לוק יומי'
}

function getCatEmoji(cat: string): string {
  return CLOTHING_CATEGORIES.find(c => c.value === cat)?.emoji ?? '👗'
}

function SwipeCard({
  combo,
  onLeft,
  onRight,
  onUp,
  triggerDir,
  onTriggered,
}: {
  combo: Combo
  onLeft: () => void
  onRight: () => void
  onUp: () => void
  triggerDir: 'left' | 'right' | 'up' | null
  onTriggered: () => void
}) {
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | 'up' | null>(null)
  const startRef = useRef({ x: 0, y: 0, cardX: 0, cardY: 0 })
  const THRESHOLD = 80

  useEffect(() => {
    if (triggerDir && !exiting) {
      setExiting(triggerDir)
      setTimeout(() => {
        onTriggered()
        if (triggerDir === 'left') onLeft()
        else if (triggerDir === 'right') onRight()
        else onUp()
      }, 320)
    }
  }, [triggerDir])

  function startDrag(clientX: number, clientY: number) {
    if (exiting) return
    setDragging(true)
    startRef.current = { x: clientX, y: clientY, cardX: x, cardY: y }
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragging) return
    setX(startRef.current.cardX + clientX - startRef.current.x)
    setY(startRef.current.cardY + clientY - startRef.current.y)
  }

  function endDrag() {
    if (!dragging) return
    setDragging(false)
    if (x > THRESHOLD) doExit('right')
    else if (x < -THRESHOLD) doExit('left')
    else if (y < -THRESHOLD) doExit('up')
    else { setX(0); setY(0) }
  }

  function doExit(dir: 'left' | 'right' | 'up') {
    if (exiting) return
    setExiting(dir)
    setTimeout(() => {
      if (dir === 'left') onLeft()
      else if (dir === 'right') onRight()
      else onUp()
    }, 320)
  }

  const rotation = x * 0.04
  const flyX = exiting === 'right' ? 700 : exiting === 'left' ? -700 : x
  const flyY = exiting === 'up' ? -700 : y

  const likeOpacity = !exiting && x > 20 ? Math.min(x / THRESHOLD, 1) : 0
  const nopeOpacity = !exiting && x < -20 ? Math.min(-x / THRESHOLD, 1) : 0
  const wearOpacity = !exiting && y < -20 ? Math.min(-y / THRESHOLD, 1) : 0

  const cols = combo.items.length <= 2 ? 2 : combo.items.length <= 4 ? 2 : 3
  const rows = combo.items.length <= 2 ? 1 : 2

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      style={{
        transform: `translate(${flyX}px, ${flyY}px) rotate(${rotation}deg)`,
        transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.32s',
        opacity: exiting ? 0 : 1,
        zIndex: 10,
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={e => startDrag(e.clientX, e.clientY)}
      onMouseMove={e => moveDrag(e.clientX, e.clientY)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY) }}
      onTouchEnd={endDrag}
    >
      <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Swipe labels */}
        <div className="absolute top-6 left-6 z-20 border-4 border-green-400 text-green-400 rounded-2xl px-4 py-2 text-xl font-black rotate-[-15deg]"
          style={{ opacity: likeOpacity, transition: 'opacity 0.08s' }}>
          שמור ❤️
        </div>
        <div className="absolute top-6 right-6 z-20 border-4 border-red-400 text-red-400 rounded-2xl px-4 py-2 text-xl font-black rotate-[15deg]"
          style={{ opacity: nopeOpacity, transition: 'opacity 0.08s' }}>
          דלג ✕
        </div>
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 border-4 border-blue-400 text-blue-400 rounded-2xl px-4 py-2 text-xl font-black"
          style={{ opacity: wearOpacity, transition: 'opacity 0.08s' }}>
          לביש היום 📅
        </div>

        {/* Item grid */}
        <div
          className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 p-4 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
        >
          {combo.items.slice(0, 6).map(item => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden flex items-center justify-center min-h-0">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" draggable={false} />
              ) : (
                <span className="text-4xl">{getCatEmoji(item.category)}</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-gray-50 flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900">{getComboName(combo.items)}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {combo.items.slice(0, 5).map(item => (
              <span key={item.id} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {getCatEmoji(item.category)} {item.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [combos, setCombos] = useState<Combo[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [triggerDir, setTriggerDir] = useState<'left' | 'right' | 'up' | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('wardrobe_items').select('*').eq('user_id', user.id)
    const loaded = data ?? []
    setItems(loaded)
    setCombos(generateCombos(loaded))
    setLoading(false)
  }

  const currentCombo = combos[index]
  const nextCombo = combos[index + 1]
  const nextNextCombo = combos[index + 2]
  const isDone = !loading && index >= combos.length

  async function handleSave() {
    const combo = combos[index]
    if (!combo) return
    setSaved(s => s + 1)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date().toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })
    const name = `${getComboName(combo.items)} · ${now}`
    const { data: outfit } = await supabase.from('outfits').insert({
      user_id: user.id,
      name,
      is_favorite: true,
    }).select().single()

    if (outfit) {
      await supabase.from('outfit_items').insert(
        combo.items.map((item, i) => ({
          outfit_id: outfit.id,
          wardrobe_item_id: item.id,
          z_index: i,
        }))
      )
    }
    toast('הלוק נשמר! ❤️')
  }

  async function handleWearToday() {
    const combo = combos[index]
    if (!combo) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('outfit_history').insert({
      user_id: user.id,
      worn_date: new Date().toISOString().slice(0, 10),
      category_label: getComboName(combo.items),
    })
    toast('נרשם כלוק של היום! 📅')
  }

  function handleSkip() {
    setSkipped(s => s + 1)
    setIndex(i => i + 1)
  }

  function triggerSwipe(dir: 'left' | 'right' | 'up') {
    setTriggerDir(dir)
  }

  function onCardLeft() { setTriggerDir(null); handleSkip() }
  function onCardRight() { setTriggerDir(null); setIndex(i => i + 1); handleSave() }
  function onCardUp() { setTriggerDir(null); setIndex(i => i + 1); handleWearToday() }
  function onTriggered() { setTriggerDir(null) }

  function reshuffle() {
    setCombos(generateCombos(items))
    setIndex(0)
    setSaved(0)
    setSkipped(0)
  }

  const hasEnoughItems = items.length >= 2 && (
    (items.some(i => i.category === 'tops') && items.some(i => i.category === 'bottoms')) ||
    items.some(i => i.category === 'dresses') ||
    items.some(i => i.category === 'activewear')
  )

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <Link href="/outfits" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowRight size={18} />
          <span className="text-sm font-medium">חזרה</span>
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">גלה לוקים</h1>
          {!isDone && !loading && (
            <p className="text-xs text-gray-400">{index + 1} מתוך {combos.length}</p>
          )}
        </div>
        <button onClick={reshuffle} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <RefreshCw size={15} />
          ערבב
        </button>
      </div>

      {/* Stats */}
      {(saved > 0 || skipped > 0) && (
        <div className="flex gap-4 mb-3 flex-shrink-0">
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="w-5 h-5 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">{saved}</span>
            נשמרו
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="w-5 h-5 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold">{skipped}</span>
            דולגו
          </span>
        </div>
      )}

      {/* Card stack */}
      <div className="flex-1 relative min-h-0">
        {loading ? (
          <div className="absolute inset-0 bg-gray-100 rounded-3xl animate-pulse" />
        ) : !hasEnoughItems ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-gray-200 gap-4 p-8 text-center">
            <span className="text-5xl">👗</span>
            <p className="text-xl font-bold text-gray-900">צריך עוד בגדים</p>
            <p className="text-gray-500 text-sm">
              הוסף חולצות + מכנסיים, שמלה, או בגדי ספורט כדי להתחיל לגלות קומבינציות.
            </p>
            <Link href="/wardrobe" className="bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors">
              הוסף לארון
            </Link>
          </div>
        ) : isDone ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-gray-200 gap-4 p-8 text-center">
            <span className="text-5xl">🎉</span>
            <p className="text-xl font-bold text-gray-900">ראית הכל!</p>
            <p className="text-gray-500 text-sm">
              {saved > 0 && `שמרת ${saved} ${saved === 1 ? 'לוק' : 'לוקים'}. `}
              ערבב שוב לקומבינציות חדשות.
            </p>
            <button onClick={reshuffle} className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors">
              <Shuffle size={16} />
              קומבינציות חדשות
            </button>
          </div>
        ) : (
          <>
            {nextNextCombo && (
              <div className="absolute inset-0 bg-white rounded-3xl shadow border border-gray-100"
                style={{ transform: 'scale(0.91) translateY(16px)', zIndex: 8 }} />
            )}
            {nextCombo && (
              <div className="absolute inset-0 bg-white rounded-3xl shadow-lg"
                style={{ transform: 'scale(0.96) translateY(8px)', zIndex: 9 }} />
            )}
            {currentCombo && (
              <SwipeCard
                key={currentCombo.id}
                combo={currentCombo}
                onLeft={onCardLeft}
                onRight={onCardRight}
                onUp={onCardUp}
                triggerDir={triggerDir}
                onTriggered={onTriggered}
              />
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {!loading && !isDone && hasEnoughItems && (
        <div className="flex-shrink-0 mt-6 space-y-3">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => triggerSwipe('left')}
              className="w-14 h-14 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-red-300 hover:bg-red-50 transition-all group"
              title="דלג"
            >
              <X size={22} className="text-gray-400 group-hover:text-red-400 transition-colors" />
            </button>
            <button
              onClick={() => triggerSwipe('up')}
              className="w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-blue-300 hover:bg-blue-50 transition-all group"
              title="לביש היום"
            >
              <Calendar size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </button>
            <button
              onClick={() => triggerSwipe('right')}
              className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-all"
              title="שמור לוק"
            >
              <Heart size={22} className="text-white" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400">← דלג · ↑ לביש היום · שמור →</p>
        </div>
      )}
    </div>
  )
}

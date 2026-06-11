'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, ClothingCategory, Season } from '@/types/database'
import { CLOTHING_CATEGORIES, SEASONS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ArrowRight, Save, Trash2, Plus, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'

type CanvasItem = {
  id: string
  wardrobeItem: WardrobeItem
  x: number
  y: number
  size: number
  zIndex: number
}

const BG_OPTIONS = [
  { key: 'white', value: '#ffffff' },
  { key: 'ivory', value: '#fdf8f2' },
  { key: 'cloud', value: '#f3f4f6' },
  { key: 'dark', value: '#1e293b' },
  { key: 'pink', value: '#fff0f3' },
  { key: 'sky', value: '#eff6ff' },
  { key: 'green', value: '#f0fdf4' },
] as const

function getCatEmoji(cat: string) {
  return CLOTHING_CATEGORIES.find(c => c.value === cat)?.emoji ?? '👗'
}

export default function CanvasBuilderPage() {
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([])
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all')
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bg, setBg] = useState('#ffffff')
  const [pickerOpen, setPickerOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [outfitName, setOutfitName] = useState('')
  const [outfitOccasion, setOutfitOccasion] = useState('')
  const [outfitSeason, setOutfitSeason] = useState<Season | ''>('')
  const [isPublic, setIsPublic] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null)

  const { toast } = useToast()
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadItems() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        setCanvasItems(prev => prev.filter(i => i.id !== selectedId))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  async function loadItems() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('category')
    setWardrobeItems(data ?? [])
    setLoading(false)
  }

  function addToCanvas(item: WardrobeItem) {
    const canvas = canvasRef.current
    if (!canvas) return
    const { offsetWidth: cw, offsetHeight: ch } = canvas
    const SIZE = Math.min(Math.max(cw * 0.25, 100), 180)
    const x = cw / 2 - SIZE / 2 + (Math.random() - 0.5) * 80
    const y = ch / 2 - SIZE / 2 + (Math.random() - 0.5) * 80
    const maxZ = canvasItems.reduce((m, i) => Math.max(m, i.zIndex), 0)
    const newItem: CanvasItem = {
      id: `${item.id}-${Date.now()}`,
      wardrobeItem: item,
      x, y, size: SIZE,
      zIndex: maxZ + 1,
    }
    setCanvasItems(prev => [...prev, newItem])
    setSelectedId(newItem.id)
  }

  function handleItemPointerDown(e: React.PointerEvent, ci: CanvasItem) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedId(ci.id)
    dragRef.current = { id: ci.id, startX: e.clientX, startY: e.clientY, itemX: ci.x, itemY: ci.y }
    const maxZ = canvasItems.reduce((m, i) => Math.max(m, i.zIndex), 0)
    setCanvasItems(prev => prev.map(i => i.id === ci.id ? { ...i, zIndex: maxZ + 1 } : i))
  }

  function handleItemPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setCanvasItems(prev => prev.map(i =>
      i.id === dragRef.current!.id
        ? { ...i, x: dragRef.current!.itemX + dx, y: dragRef.current!.itemY + dy }
        : i
    ))
  }

  function handleItemPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }

  function resizeSelected(delta: number) {
    if (!selectedId) return
    setCanvasItems(prev => prev.map(i =>
      i.id === selectedId ? { ...i, size: Math.max(60, Math.min(380, i.size + delta)) } : i
    ))
  }

  function deleteSelected() {
    if (!selectedId) return
    setCanvasItems(prev => prev.filter(i => i.id !== selectedId))
    setSelectedId(null)
  }

  async function saveOutfit() {
    if (!outfitName.trim() || canvasItems.length === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const canvas = canvasRef.current
    const cw = canvas?.offsetWidth ?? 600
    const ch = canvas?.offsetHeight ?? 600

    const firstImageItem = canvasItems.find(ci => ci.wardrobeItem.image_url)

    const { data: outfit, error } = await supabase.from('outfits').insert({
      user_id: user.id,
      name: outfitName,
      occasion: outfitOccasion || null,
      season: (outfitSeason || null) as Season | null,
      is_public: isPublic,
      image_url: firstImageItem?.wardrobeItem.image_url ?? null,
    }).select().single()

    if (error || !outfit) {
      toast(t.newOutfit.saveError, 'error')
      setSaving(false)
      return
    }

    await supabase.from('outfit_items').insert(
      canvasItems.map(ci => ({
        outfit_id: outfit.id,
        wardrobe_item_id: ci.wardrobeItem.id,
        position_x: Math.round((ci.x / cw) * 100),
        position_y: Math.round((ci.y / ch) * 100),
        z_index: ci.zIndex,
      }))
    )

    toast(t.newOutfit.saved)
    router.push('/outfits')
  }

  const filtered = wardrobeItems.filter(i => activeCategory === 'all' || i.category === activeCategory)
  const usedCategories = CLOTHING_CATEGORIES.filter(cat => wardrobeItems.some(i => i.category === cat.value))
  const selected = canvasItems.find(i => i.id === selectedId)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href="/outfits" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowRight size={16} />
          <span className="text-sm">{t.newOutfit.back}</span>
        </Link>

        <div className="flex-1 flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">{t.newOutfit.background}:</span>
          {BG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setBg(opt.value)}
              title={t.newOutfit.bg[opt.key]}
              className="w-6 h-6 rounded-full transition-all border-2"
              style={{
                backgroundColor: opt.value,
                borderColor: bg === opt.value ? '#000' : '#d1d5db',
                transform: bg === opt.value ? 'scale(1.25)' : 'scale(1)',
                boxShadow: opt.value === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : 'none',
              }}
            />
          ))}
        </div>

        <Button onClick={() => setShowSaveModal(true)} disabled={canvasItems.length === 0}>
          <Save size={15} />
          {t.newOutfit.save}
        </Button>
      </div>

      {/* Workspace */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Item picker panel */}
        <div className={`flex-shrink-0 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-200 ${pickerOpen ? 'w-52' : 'w-10'}`}>
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex items-center justify-center p-2.5 border-b border-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
            title={pickerOpen ? t.newOutfit.collapse : t.newOutfit.expand}
          >
            {pickerOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {pickerOpen && (
            <>
              <div className="flex flex-col gap-0.5 p-2 border-b border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg text-right font-medium transition-colors ${activeCategory === 'all' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {t.newOutfit.all}
                </button>
                {usedCategories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value as ClothingCategory)}
                    className={`text-xs px-3 py-1.5 rounded-lg text-right transition-colors flex items-center gap-1.5 ${activeCategory === cat.value ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{cat.emoji}</span>
                    {t.categories[cat.value as keyof typeof t.categories]}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">{t.newOutfit.noItems}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filtered.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addToCanvas(item)}
                        className="aspect-square bg-gray-50 rounded-xl overflow-hidden hover:ring-2 hover:ring-black transition-all group relative"
                        title={item.name}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl">{getCatEmoji(item.category)}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                          <Plus size={20} className="text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {wardrobeItems.length === 0 && !loading && (
                  <Link href="/wardrobe" className="block text-xs text-gray-400 underline text-center mt-4">
                    {t.newOutfit.addItemsFirst}
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        {/* Canvas column */}
        <div className="flex-1 flex flex-col min-w-0 gap-2">
          {/* Context toolbar */}
          <div className="flex items-center gap-2 h-8 flex-shrink-0">
            {selected ? (
              <>
                <span className="text-xs text-gray-500 truncate max-w-32">
                  {getCatEmoji(selected.wardrobeItem.category)} {selected.wardrobeItem.name}
                </span>
                <button
                  onClick={() => resizeSelected(-20)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  <ZoomOut size={11} /> {t.newOutfit.smaller}
                </button>
                <button
                  onClick={() => resizeSelected(20)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  <ZoomIn size={11} /> {t.newOutfit.bigger}
                </button>
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
                >
                  <Trash2 size={11} /> {t.newOutfit.remove}
                </button>
                <button onClick={() => setSelectedId(null)} className="text-xs text-gray-400 hover:text-gray-600 mr-1">
                  ✕
                </button>
              </>
            ) : canvasItems.length > 0 ? (
              <span className="text-xs text-gray-400">{t.newOutfit.selectHint}</span>
            ) : null}
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 rounded-2xl relative overflow-hidden"
            style={{ backgroundColor: bg }}
            onClick={() => setSelectedId(null)}
          >
            {canvasItems.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
                <div className="w-20 h-20 rounded-3xl bg-black/5 flex items-center justify-center">
                  <span className="text-4xl opacity-30">👗</span>
                </div>
                <p className="text-sm text-gray-400 font-medium">{t.newOutfit.emptyTitle}</p>
                <p className="text-xs text-gray-300">{t.newOutfit.emptySub}</p>
              </div>
            )}

            {canvasItems.map(ci => (
              <div
                key={ci.id}
                className="absolute"
                style={{
                  left: ci.x,
                  top: ci.y,
                  width: ci.size,
                  height: ci.size,
                  zIndex: ci.zIndex,
                  outline: selectedId === ci.id ? '2.5px solid #000' : '2.5px solid transparent',
                  outlineOffset: '3px',
                  borderRadius: '12px',
                  cursor: dragRef.current?.id === ci.id ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
                onPointerDown={e => handleItemPointerDown(e, ci)}
                onPointerMove={handleItemPointerMove}
                onPointerUp={handleItemPointerUp}
                onClick={e => e.stopPropagation()}
              >
                <div className="w-full h-full rounded-xl overflow-hidden">
                  {ci.wardrobeItem.image_url ? (
                    <img
                      src={ci.wardrobeItem.image_url}
                      alt={ci.wardrobeItem.name}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50/80">
                      <span className="text-4xl pointer-events-none">{getCatEmoji(ci.wardrobeItem.category)}</span>
                    </div>
                  )}
                </div>

                {selectedId === ci.id && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-xs py-1 px-2 truncate text-center pointer-events-none rounded-b-xl">
                    {ci.wardrobeItem.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{t.newOutfit.saveModalTitle}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t.newOutfit.outfitName} <span className="text-red-500">*</span>
                </label>
                <Input
                  value={outfitName}
                  onChange={e => setOutfitName(e.target.value)}
                  placeholder={t.newOutfit.namePlaceholder}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.newOutfit.occasion}</label>
                <Input
                  value={outfitOccasion}
                  onChange={e => setOutfitOccasion(e.target.value)}
                  placeholder={t.newOutfit.occasionPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.newOutfit.season}</label>
                <select
                  value={outfitSeason}
                  onChange={e => setOutfitSeason(e.target.value as Season)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">{t.newOutfit.anySeason}</option>
                  {SEASONS.filter(s => s.value !== 'all').map(s => <option key={s.value} value={s.value}>{s.emoji} {t.seasons[s.value as keyof typeof t.seasons]}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${isPublic ? 'bg-black' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${isPublic ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-gray-700">{t.newOutfit.makeShareable}</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowSaveModal(false)} className="flex-1">
                {t.newOutfit.cancel}
              </Button>
              <Button onClick={saveOutfit} disabled={!outfitName.trim() || saving} className="flex-1">
                {saving ? t.newOutfit.saving : t.newOutfit.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

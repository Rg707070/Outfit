'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, CatalogItem, ClothingCategory, Season } from '@/types/database'
import { CLOTHING_CATEGORIES, SEASONS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { CatalogSearch } from '@/components/look-builder/catalog-search'
import { ArrowRight, Save, Trash2, Plus, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type ItemSource = 'wardrobe' | 'catalog'

type CanvasItem = {
  id: string
  source: ItemSource
  refId: string
  name: string
  category: string
  imageUrl: string | null
  x: number
  y: number
  size: number
  zIndex: number
}

/** Reference size: persisted scale = size / BASE_SIZE, so looks reopen faithfully. */
const BASE_SIZE = 140

const BG_OPTIONS = [
  { label: 'לבן', value: '#ffffff' },
  { label: 'שנהב', value: '#fdf8f2' },
  { label: 'ענן', value: '#f3f4f6' },
  { label: 'כהה', value: '#1e293b' },
  { label: 'ורוד', value: '#fff0f3' },
  { label: 'תכלת', value: '#eff6ff' },
  { label: 'ירוק', value: '#f0fdf4' },
]

function getCatEmoji(cat: string) {
  return CLOTHING_CATEGORIES.find((c) => c.value === cat)?.emoji ?? '👗'
}

/** Draggable wardrobe card in the picker (click to add, or drag onto the canvas). */
function WardrobeCard({ item, onAdd }: { item: WardrobeItem; onAdd: (item: WardrobeItem) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `wardrobe:${item.id}`,
    data: { kind: 'wardrobe', item },
  })
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(item)}
      className={`aspect-square bg-gray-50 rounded-xl overflow-hidden hover:ring-2 hover:ring-black transition-all group relative ${isDragging ? 'opacity-40' : ''}`}
      title={item.name}
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
    </button>
  )
}

function CanvasBuilder() {
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([])
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all')
  const [panelTab, setPanelTab] = useState<'wardrobe' | 'catalog'>('catalog')
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeDrag, setActiveDrag] = useState<{ name: string; imageUrl: string | null; category: string } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const canvasElRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null)

  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createClient())

  const { setNodeRef: setDroppableRef } = useDroppable({ id: 'look-canvas' })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function setCanvasRef(el: HTMLDivElement | null) {
    canvasElRef.current = el
    setDroppableRef(el)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        setCanvasItems((prev) => prev.filter((i) => i.id !== selectedId))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  async function loadItems() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('category')
    setWardrobeItems(data ?? [])
    setLoading(false)
  }

  async function loadOutfit(id: string) {
    const { data: outfit } = await supabase.from('outfits').select('*').eq('id', id).single()
    if (outfit) {
      setEditingId(id)
      setOutfitName(outfit.name)
      setOutfitOccasion(outfit.occasion ?? '')
      setOutfitSeason((outfit.season as Season) ?? '')
      setIsPublic(!!outfit.is_public)
    }
    const { data: rows } = await supabase
      .from('outfit_items')
      .select('*, wardrobe_items(*), catalog_items(*)')
      .eq('outfit_id', id)

    const cw = canvasElRef.current?.offsetWidth ?? 600
    const ch = canvasElRef.current?.offsetHeight ?? 600
    const loaded: CanvasItem[] = (rows ?? []).map((r, idx) => {
      const w = (r as { wardrobe_items: WardrobeItem | null }).wardrobe_items
      const c = (r as { catalog_items: CatalogItem | null }).catalog_items
      const source: ItemSource = c ? 'catalog' : 'wardrobe'
      const ref = c ?? w
      return {
        id: `${r.id}`,
        source,
        refId: source === 'catalog' ? r.catalog_item_id! : r.wardrobe_item_id!,
        name: ref?.name ?? '',
        category: ref?.category ?? 'other',
        imageUrl: ref?.image_url ?? null,
        x: ((r.position_x ?? 50) / 100) * cw,
        y: ((r.position_y ?? 50) / 100) * ch,
        size: (r.scale ?? 1) * BASE_SIZE,
        zIndex: r.z_index ?? idx + 1,
      }
    })
    setCanvasItems(loaded)
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    loadItems()
    const editId = searchParams.get('id')
    if (editId) loadOutfit(editId)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function nextZ() {
    return canvasItems.reduce((m, i) => Math.max(m, i.zIndex), 0) + 1
  }

  function addCanvasItem(
    source: ItemSource,
    refId: string,
    name: string,
    category: string,
    imageUrl: string | null,
    at?: { x: number; y: number },
  ) {
    const canvas = canvasElRef.current
    if (!canvas) return
    const { offsetWidth: cw, offsetHeight: ch } = canvas
    const SIZE = Math.min(Math.max(cw * 0.25, 100), 180)
    const x = at ? at.x - SIZE / 2 : cw / 2 - SIZE / 2 + (Math.random() - 0.5) * 80
    const y = at ? at.y - SIZE / 2 : ch / 2 - SIZE / 2 + (Math.random() - 0.5) * 80
    const newItem: CanvasItem = {
      id: `${source}-${refId}-${Date.now()}`,
      source,
      refId,
      name,
      category,
      imageUrl,
      x: Math.max(0, Math.min(x, cw - 40)),
      y: Math.max(0, Math.min(y, ch - 40)),
      size: SIZE,
      zIndex: nextZ(),
    }
    setCanvasItems((prev) => [...prev, newItem])
    setSelectedId(newItem.id)
  }

  const addWardrobe = (item: WardrobeItem, at?: { x: number; y: number }) =>
    addCanvasItem('wardrobe', item.id, item.name, item.category, item.image_url, at)
  const addCatalog = (item: CatalogItem, at?: { x: number; y: number }) =>
    addCanvasItem('catalog', item.id, item.name, item.category, item.image_url, at)

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as
      | { kind: 'wardrobe'; item: WardrobeItem }
      | { kind: 'catalog'; item: CatalogItem }
      | undefined
    if (!data) return
    setActiveDrag({ name: data.item.name, imageUrl: data.item.image_url, category: data.item.category })
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (over?.id !== 'look-canvas') return
    const data = active.data.current as
      | { kind: 'wardrobe'; item: WardrobeItem }
      | { kind: 'catalog'; item: CatalogItem }
      | undefined
    if (!data) return

    const canvas = canvasElRef.current
    const rect = canvas?.getBoundingClientRect()
    const translated = active.rect.current.translated
    let at: { x: number; y: number } | undefined
    if (rect && translated) {
      at = {
        x: translated.left + translated.width / 2 - rect.left,
        y: translated.top + translated.height / 2 - rect.top,
      }
    }
    if (data.kind === 'wardrobe') addWardrobe(data.item, at)
    else addCatalog(data.item, at)
  }

  function handleItemPointerDown(e: React.PointerEvent, ci: CanvasItem) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedId(ci.id)
    setDraggingId(ci.id)
    dragRef.current = { id: ci.id, startX: e.clientX, startY: e.clientY, itemX: ci.x, itemY: ci.y }
    const z = nextZ()
    setCanvasItems((prev) => prev.map((i) => (i.id === ci.id ? { ...i, zIndex: z } : i)))
  }

  function handleItemPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setCanvasItems((prev) =>
      prev.map((i) =>
        i.id === dragRef.current!.id ? { ...i, x: dragRef.current!.itemX + dx, y: dragRef.current!.itemY + dy } : i,
      ),
    )
  }

  function handleItemPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    setDraggingId(null)
  }

  function resizeSelected(delta: number) {
    if (!selectedId) return
    setCanvasItems((prev) =>
      prev.map((i) => (i.id === selectedId ? { ...i, size: Math.max(60, Math.min(380, i.size + delta)) } : i)),
    )
  }

  function deleteSelected() {
    if (!selectedId) return
    setCanvasItems((prev) => prev.filter((i) => i.id !== selectedId))
    setSelectedId(null)
  }

  async function saveOutfit() {
    if (!outfitName.trim() || canvasItems.length === 0) return
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const canvas = canvasElRef.current
    const cw = canvas?.offsetWidth ?? 600
    const ch = canvas?.offsetHeight ?? 600
    const firstImage = canvasItems.find((ci) => ci.imageUrl)?.imageUrl ?? null

    const outfitPayload = {
      name: outfitName,
      occasion: outfitOccasion || null,
      season: (outfitSeason || null) as Season | null,
      is_public: isPublic,
      image_url: firstImage,
    }

    let outfitId = editingId
    if (editingId) {
      const { error } = await supabase.from('outfits').update(outfitPayload).eq('id', editingId)
      if (error) {
        toast('שגיאה בעדכון הלוק', 'error')
        setSaving(false)
        return
      }
      await supabase.from('outfit_items').delete().eq('outfit_id', editingId)
    } else {
      const { data: outfit, error } = await supabase
        .from('outfits')
        .insert({ user_id: user.id, ...outfitPayload })
        .select()
        .single()
      if (error || !outfit) {
        toast('שגיאה בשמירת הלוק', 'error')
        setSaving(false)
        return
      }
      outfitId = outfit.id
    }

    const { error: itemsError } = await supabase.from('outfit_items').insert(
      canvasItems.map((ci) => ({
        outfit_id: outfitId!,
        wardrobe_item_id: ci.source === 'wardrobe' ? ci.refId : null,
        catalog_item_id: ci.source === 'catalog' ? ci.refId : null,
        position_x: Math.round((ci.x / cw) * 100),
        position_y: Math.round((ci.y / ch) * 100),
        scale: Number((ci.size / BASE_SIZE).toFixed(3)),
        z_index: ci.zIndex,
      })),
    )
    if (itemsError) {
      toast('שגיאה בשמירת פריטי הלוק', 'error')
      setSaving(false)
      return
    }

    toast(editingId ? 'הלוק עודכן! 🎨' : 'הלוק נשמר! 🎨')
    router.push('/outfits')
  }

  const filtered = wardrobeItems.filter((i) => activeCategory === 'all' || i.category === activeCategory)
  const usedCategories = CLOTHING_CATEGORIES.filter((cat) => wardrobeItems.some((i) => i.category === cat.value))
  const selected = canvasItems.find((i) => i.id === selectedId)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
          <Link href="/outfits" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowRight size={16} />
            <span className="text-sm">חזרה</span>
          </Link>

          <div className="flex-1 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">רקע:</span>
            {BG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBg(opt.value)}
                title={opt.label}
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
            {editingId ? 'עדכן לוק' : 'שמור לוק'}
          </Button>
        </div>

        {/* Workspace */}
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Item picker panel */}
          <div
            className={`flex-shrink-0 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-200 ${pickerOpen ? 'w-60' : 'w-10'}`}
          >
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="flex items-center justify-center p-2.5 border-b border-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
              title={pickerOpen ? 'כווץ' : 'הרחב'}
            >
              {pickerOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>

            {pickerOpen && (
              <>
                {/* Source tabs */}
                <div className="flex gap-1 p-2 border-b border-gray-100 flex-shrink-0">
                  <button
                    onClick={() => setPanelTab('catalog')}
                    className={`flex-1 text-xs px-2 py-1.5 rounded-lg font-medium transition-colors ${panelTab === 'catalog' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    מאגר
                  </button>
                  <button
                    onClick={() => setPanelTab('wardrobe')}
                    className={`flex-1 text-xs px-2 py-1.5 rounded-lg font-medium transition-colors ${panelTab === 'wardrobe' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    הארון שלי
                  </button>
                </div>

                {panelTab === 'catalog' ? (
                  <CatalogSearch onAdd={(item) => addCatalog(item)} />
                ) : (
                  <>
                    <div className="flex flex-col gap-0.5 p-2 border-b border-gray-100 flex-shrink-0">
                      <button
                        onClick={() => setActiveCategory('all')}
                        className={`text-xs px-3 py-1.5 rounded-lg text-right font-medium transition-colors ${activeCategory === 'all' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        הכל
                      </button>
                      {usedCategories.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setActiveCategory(cat.value as ClothingCategory)}
                          className={`text-xs px-3 py-1.5 rounded-lg text-right transition-colors flex items-center gap-1.5 ${activeCategory === cat.value ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          <span>{cat.emoji}</span>
                          {cat.label}
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
                        <p className="text-xs text-gray-400 text-center py-6">אין פריטים</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {filtered.map((item) => (
                            <WardrobeCard key={item.id} item={item} onAdd={(it) => addWardrobe(it)} />
                          ))}
                        </div>
                      )}

                      {wardrobeItems.length === 0 && !loading && (
                        <Link href="/wardrobe" className="block text-xs text-gray-400 underline text-center mt-4">
                          הוסף פריטים לארון תחילה
                        </Link>
                      )}
                    </div>
                  </>
                )}
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
                    {getCatEmoji(selected.category)} {selected.name}
                  </span>
                  <button
                    onClick={() => resizeSelected(-20)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    <ZoomOut size={11} /> קטן
                  </button>
                  <button
                    onClick={() => resizeSelected(20)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    <ZoomIn size={11} /> גדול
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
                  >
                    <Trash2 size={11} /> הסר
                  </button>
                  <button onClick={() => setSelectedId(null)} className="text-xs text-gray-400 hover:text-gray-600 mr-1">
                    ✕
                  </button>
                </>
              ) : canvasItems.length > 0 ? (
                <span className="text-xs text-gray-400">לחץ על פריט לבחירה · גרור להזזה · Delete להסרה</span>
              ) : null}
            </div>

            {/* Canvas */}
            <div
              ref={setCanvasRef}
              className="flex-1 rounded-2xl relative overflow-hidden"
              style={{ backgroundColor: bg }}
              onClick={() => setSelectedId(null)}
            >
              {canvasItems.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
                  <div className="w-20 h-20 rounded-3xl bg-black/5 flex items-center justify-center">
                    <span className="text-4xl opacity-30">👗</span>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">חפש במאגר או בחר מהארון — לחץ או גרור ללוח</p>
                  <p className="text-xs text-gray-300">גרור לסידור · שנה גודל · שמור כשמוכן</p>
                </div>
              )}

              {canvasItems.map((ci) => (
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
                    cursor: draggingId === ci.id ? 'grabbing' : 'grab',
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => handleItemPointerDown(e, ci)}
                  onPointerMove={handleItemPointerMove}
                  onPointerUp={handleItemPointerUp}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full h-full rounded-xl overflow-hidden">
                    {ci.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ci.imageUrl} alt={ci.name} className="w-full h-full object-contain" draggable={false} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50/80">
                        <span className="text-4xl pointer-events-none">{getCatEmoji(ci.category)}</span>
                      </div>
                    )}
                  </div>

                  {selectedId === ci.id && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-xs py-1 px-2 truncate text-center pointer-events-none rounded-b-xl">
                      {ci.name}
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
              <h2 className="text-lg font-semibold text-gray-900 mb-5">{editingId ? 'עדכן לוק' : 'שמור לוק'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    שם הלוק <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    placeholder="לדוג׳ לוק קז׳ואל של סוף שבוע"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">אירוע</label>
                  <Input
                    value={outfitOccasion}
                    onChange={(e) => setOutfitOccasion(e.target.value)}
                    placeholder="קז׳ואל, עבודה, ערב…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">עונה</label>
                  <select
                    value={outfitSeason}
                    onChange={(e) => setOutfitSeason(e.target.value as Season)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">כל העונות</option>
                    {SEASONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.emoji} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${isPublic ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${isPublic ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">אפשר שיתוף (קישור ציבורי)</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowSaveModal(false)} className="flex-1">
                  ביטול
                </Button>
                <Button onClick={saveOutfit} disabled={!outfitName.trim() || saving} className="flex-1">
                  {saving ? 'שומר…' : editingId ? 'עדכן לוק' : 'שמור לוק'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="w-24 h-24 rounded-xl overflow-hidden shadow-2xl ring-2 ring-black bg-white">
            {activeDrag.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeDrag.imageUrl} alt={activeDrag.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl">{getCatEmoji(activeDrag.category)}</span>
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default function CanvasBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">טוען…</div>}>
      <CanvasBuilder />
    </Suspense>
  )
}

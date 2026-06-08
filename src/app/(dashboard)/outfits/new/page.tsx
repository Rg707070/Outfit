'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, ClothingCategory, Season } from '@/types/database'
import { CLOTHING_CATEGORIES, SEASONS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/auth-context'
import { outfitSchema } from '@/lib/validations'
import {
  ArrowRight,
  Save,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
} from 'lucide-react'
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

type CanvasState = { items: CanvasItem[]; selectedId: string | null }

type CanvasAction =
  | { type: 'ADD'; item: CanvasItem }
  | { type: 'MOVE'; id: string; x: number; y: number }
  | { type: 'RESIZE'; id: string; size: number }
  | { type: 'DELETE'; id: string }
  | { type: 'SELECT'; id: string | null }
  | { type: 'BRING_FRONT'; id: string; maxZ: number }
  | { type: 'SET'; items: CanvasItem[] }

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD':
      return { ...state, items: [...state.items, action.item], selectedId: action.item.id }
    case 'MOVE':
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, x: action.x, y: action.y } : i
        ),
      }
    case 'RESIZE':
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, size: Math.max(60, Math.min(380, action.size)) } : i
        ),
      }
    case 'DELETE':
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      }
    case 'SELECT':
      return { ...state, selectedId: action.id }
    case 'BRING_FRONT':
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, zIndex: action.maxZ + 1 } : i)),
      }
    case 'SET':
      return { ...state, items: action.items }
    default:
      return state
  }
}

function useUndoRedo<S>(reducer: (s: S, a: CanvasAction) => S, initialState: S) {
  const [past, setPast] = useState<S[]>([])
  const [present, setPresent] = useState<S>(initialState)
  const [future, setFuture] = useState<S[]>([])

  const dispatch = useCallback(
    (action: CanvasAction) => {
      const next = reducer(present, action)
      if (action.type === 'SELECT') {
        setPresent(next)
        return
      }
      setPast((p) => [...p, present])
      setPresent(next)
      setFuture([])
    },
    [present, reducer]
  )

  const undo = useCallback(() => {
    if (past.length === 0) return
    setFuture((f) => [present, ...f])
    setPresent(past[past.length - 1])
    setPast((p) => p.slice(0, -1))
  }, [past, present])

  const redo = useCallback(() => {
    if (future.length === 0) return
    setPast((p) => [...p, present])
    setPresent(future[0])
    setFuture((f) => f.slice(1))
  }, [future, present])

  return {
    state: present,
    dispatch,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  }
}

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

export default function CanvasBuilderPage() {
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([])
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all')
  const [bg, setBg] = useState('#ffffff')
  const [pickerOpen, setPickerOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [outfitName, setOutfitName] = useState('')
  const [outfitNameError, setOutfitNameError] = useState('')
  const [outfitOccasion, setOutfitOccasion] = useState('')
  const [outfitSeason, setOutfitSeason] = useState<Season | ''>('')
  const [isPublic, setIsPublic] = useState(false)

  const {
    state: canvasState,
    dispatch,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo(canvasReducer, { items: [], selectedId: null })

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    id: string
    startX: number
    startY: number
    itemX: number
    itemY: number
  } | null>(null)

  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useLang()
  const supabase = createClient()

  async function loadItems() {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', user.id)
        .order('category')
      if (error) throw error
      setWardrobeItems(data ?? [])
    } catch {
      toast('שגיאה בטעינת הפריטים', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadItems()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if ((e.key === 'Delete' || e.key === 'Backspace') && canvasState.selectedId) {
        dispatch({ type: 'DELETE', id: canvasState.selectedId })
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canvasState.selectedId, undo, redo, dispatch])

  function addToCanvas(item: WardrobeItem) {
    const canvas = canvasRef.current
    if (!canvas) return
    const { offsetWidth: cw, offsetHeight: ch } = canvas
    const SIZE = Math.min(Math.max(cw * 0.25, 100), 180)
    /* eslint-disable react-hooks/purity */
    const x = cw / 2 - SIZE / 2 + (Math.random() - 0.5) * 80
    const y = ch / 2 - SIZE / 2 + (Math.random() - 0.5) * 80
    const maxZ = canvasState.items.reduce((m, i) => Math.max(m, i.zIndex), 0)
    const newItem: CanvasItem = {
      id: `${item.id}-${Date.now()}`,
      wardrobeItem: item,
      x,
      y,
      size: SIZE,
      zIndex: maxZ + 1,
    }
    /* eslint-enable react-hooks/purity */
    dispatch({ type: 'ADD', item: newItem })
  }

  function handleItemPointerDown(e: React.PointerEvent, ci: CanvasItem) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dispatch({ type: 'SELECT', id: ci.id })
    setDraggingId(ci.id)
    dragRef.current = { id: ci.id, startX: e.clientX, startY: e.clientY, itemX: ci.x, itemY: ci.y }
    const maxZ = canvasState.items.reduce((m, i) => Math.max(m, i.zIndex), 0)
    dispatch({ type: 'BRING_FRONT', id: ci.id, maxZ })
  }

  function handleItemPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    dispatch({
      type: 'MOVE',
      id: dragRef.current.id,
      x: dragRef.current.itemX + dx,
      y: dragRef.current.itemY + dy,
    })
  }

  function handleItemPointerUp(e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDraggingId(null)
    dragRef.current = null
  }

  function resizeSelected(delta: number) {
    if (!canvasState.selectedId) return
    const item = canvasState.items.find((i) => i.id === canvasState.selectedId)
    if (!item) return
    dispatch({ type: 'RESIZE', id: canvasState.selectedId, size: item.size + delta })
  }

  function deleteSelected() {
    if (!canvasState.selectedId) return
    dispatch({ type: 'DELETE', id: canvasState.selectedId })
  }

  async function saveOutfit() {
    const result = outfitSchema.safeParse({
      name: outfitName,
      occasion: outfitOccasion || undefined,
    })
    if (!result.success) {
      setOutfitNameError(result.error.issues[0]?.message ?? 'שגיאה')
      return
    }
    setOutfitNameError('')
    if (canvasState.items.length === 0 || !user) return
    setSaving(true)

    const canvas = canvasRef.current
    const cw = canvas?.offsetWidth ?? 600
    const ch = canvas?.offsetHeight ?? 600
    const firstImageItem = canvasState.items.find((ci) => ci.wardrobeItem.image_url)

    try {
      const { data: outfit, error } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: outfitName,
          occasion: outfitOccasion || null,
          season: (outfitSeason || null) as Season | null,
          is_public: isPublic,
          image_url: firstImageItem?.wardrobeItem.image_url ?? null,
        })
        .select()
        .single()

      if (error || !outfit) throw error ?? new Error('שגיאה בשמירת הלוק')

      const { error: itemsError } = await supabase.from('outfit_items').insert(
        canvasState.items.map((ci) => ({
          outfit_id: outfit.id,
          wardrobe_item_id: ci.wardrobeItem.id,
          position_x: Math.round((ci.x / cw) * 100),
          position_y: Math.round((ci.y / ch) * 100),
          z_index: ci.zIndex,
        }))
      )
      if (itemsError) throw itemsError

      toast('הלוק נשמר! 🎨')
      router.push('/outfits')
    } catch {
      toast('שגיאה בשמירת הלוק', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = wardrobeItems.filter(
    (i) => activeCategory === 'all' || i.category === activeCategory
  )
  const usedCategories = CLOTHING_CATEGORIES.filter((cat) =>
    wardrobeItems.some((i) => i.category === cat.value)
  )
  const selected = canvasState.items.find((i) => i.id === canvasState.selectedId)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link
          href="/outfits"
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowRight size={16} />
          <span className="text-sm">{t.wardrobe.cancel}</span>
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

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
            title="בטל (Ctrl+Z)"
            aria-label="בטל"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
            title="בצע שוב (Ctrl+Y)"
            aria-label="בצע שוב"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <Button onClick={() => setShowSaveModal(true)} disabled={canvasState.items.length === 0}>
          <Save size={15} />
          {t.newOutfit.save}
        </Button>
      </div>

      {/* Workspace */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Item picker panel */}
        <div
          className={`flex-shrink-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden transition-all duration-200 ${pickerOpen ? 'w-52' : 'w-10'}`}
        >
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex items-center justify-center p-2.5 border-b border-gray-100 dark:border-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            aria-label={pickerOpen ? 'כווץ' : 'הרחב'}
          >
            {pickerOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {pickerOpen && (
            <>
              <div className="flex flex-col gap-0.5 p-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg text-right font-medium transition-colors ${activeCategory === 'all' ? 'bg-black text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  {t.newOutfit.all}
                </button>
                {usedCategories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value as ClothingCategory)}
                    className={`text-xs px-3 py-1.5 rounded-lg text-right transition-colors flex items-center gap-1.5 ${activeCategory === cat.value ? 'bg-black text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
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
                      <div
                        key={i}
                        className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">אין פריטים</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addToCanvas(item)}
                        className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-black transition-all group relative"
                        title={item.name}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
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
                  <Link
                    href="/wardrobe"
                    className="block text-xs text-gray-400 underline text-center mt-4"
                  >
                    הוסף פריטים לארון תחילה
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
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                  aria-label="הקטן"
                >
                  <ZoomOut size={11} /> קטן
                </button>
                <button
                  onClick={() => resizeSelected(20)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                  aria-label="הגדל"
                >
                  <ZoomIn size={11} /> גדול
                </button>
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
                  aria-label="הסר פריט"
                >
                  <Trash2 size={11} /> הסר
                </button>
                <button
                  onClick={() => dispatch({ type: 'SELECT', id: null })}
                  className="text-xs text-gray-400 hover:text-gray-600 mr-1"
                  aria-label="בטל בחירה"
                >
                  ✕
                </button>
              </>
            ) : canvasState.items.length > 0 ? (
              <span className="text-xs text-gray-400">
                לחץ על פריט לבחירה · גרור להזזה · Delete להסרה · Ctrl+Z לביטול
              </span>
            ) : null}
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 rounded-2xl relative overflow-hidden"
            style={{ backgroundColor: bg }}
            onClick={() => dispatch({ type: 'SELECT', id: null })}
          >
            {canvasState.items.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
                <div className="w-20 h-20 rounded-3xl bg-black/5 flex items-center justify-center">
                  <span className="text-4xl opacity-30">👗</span>
                </div>
                <p className="text-sm text-gray-400 font-medium">
                  לחץ על פריטים כדי להוסיף אותם ללוח
                </p>
                <p className="text-xs text-gray-300">גרור לסידור · שנה גודל · שמור כשמוכן</p>
              </div>
            )}

            {canvasState.items.map((ci) => (
              <div
                key={ci.id}
                className="absolute"
                style={{
                  left: ci.x,
                  top: ci.y,
                  width: ci.size,
                  height: ci.size,
                  zIndex: ci.zIndex,
                  outline:
                    canvasState.selectedId === ci.id
                      ? '2.5px solid #000'
                      : '2.5px solid transparent',
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
                  {ci.wardrobeItem.image_url ? (
                    <img
                      src={ci.wardrobeItem.image_url}
                      alt={ci.wardrobeItem.name}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50/80">
                      <span className="text-4xl pointer-events-none">
                        {getCatEmoji(ci.wardrobeItem.category)}
                      </span>
                    </div>
                  )}
                </div>

                {canvasState.selectedId === ci.id && (
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">שמור לוק</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  שם הלוק <span className="text-red-500">*</span>
                </label>
                <Input
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  placeholder="לדוג׳ לוק קז׳ואל של סוף שבוע"
                  autoFocus
                />
                {outfitNameError && <p className="text-xs text-red-500 mt-1">{outfitNameError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  אירוע
                </label>
                <Input
                  value={outfitOccasion}
                  onChange={(e) => setOutfitOccasion(e.target.value)}
                  placeholder="קז׳ואל, עבודה, ערב…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  עונה
                </label>
                <select
                  value={outfitSeason}
                  onChange={(e) => setOutfitSeason(e.target.value as Season)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:text-white"
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
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${isPublic ? 'bg-black' : 'bg-gray-200 dark:bg-gray-700'}`}
                  aria-label={isPublic ? 'הסר שיתוף ציבורי' : 'אפשר שיתוף ציבורי'}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${isPublic ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  אפשר שיתוף (קישור ציבורי)
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowSaveModal(false)}
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={saveOutfit}
                disabled={!outfitName.trim() || saving}
                className="flex-1"
              >
                {saving ? 'שומר…' : 'שמור לוק'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

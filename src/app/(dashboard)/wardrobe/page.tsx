'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, ClothingCategory } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import {
  Plus, Search, Heart, Upload, Trash2, X, Camera, Check,
} from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export default function WardrobePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen pb-nav px-4 pt-16 grid grid-cols-2 gap-3">{Array.from({length: 8}).map((_,i) => <div key={i} className="aspect-square bg-white rounded-2xl animate-pulse"/>)}</div>}>
      <WardrobePage />
    </Suspense>
  )
}

function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const { toast } = useToast()
  const { t } = useLang()
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    loadItems()
    if (searchParams.get('add') === '1') setShowAdd(true)
  }, [])

  async function loadItems() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  async function toggleFavorite(item: WardrobeItem, e: React.MouseEvent) {
    e.stopPropagation()
    await supabase
      .from('wardrobe_items')
      .update({ is_favorite: !item.is_favorite })
      .eq('id', item.id)
    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i))
    )
  }

  async function confirmDelete(item: WardrobeItem) {
    if (item.image_url) {
      const path = item.image_url.split('/wardrobe/')[1]
      if (path) await supabase.storage.from('wardrobe').remove([path])
    }
    await supabase.from('wardrobe_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setDeletingId(null)
    toast('פריט הוסר מהארון', 'info')
  }

  const filtered = items.filter(item => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.brand?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory =
      activeCategory === 'all' || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const counts = CLOTHING_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.value] = items.filter(i => i.category === cat.value).length
      return acc
    },
    {} as Record<string, number>
  )

  const deletingItem = deletingId ? items.find(i => i.id === deletingId) : null

  return (
    <div className="min-h-screen pb-nav">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#f9fafb]">
        <div className="flex items-center justify-between px-5 pt-12 pb-3">
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-gray-200 shadow-sm">
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="חפש לפי שם או מותג…"
                  className="flex-1 text-sm bg-transparent outline-none text-right"
                  dir="rtl"
                />
                {search && (
                  <button onClick={() => setSearch('')}>
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setShowSearch(false); setSearch('') }}
                className="text-sm text-gray-500 font-medium px-2"
              >
                ביטול
              </button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">הארון שלי</h1>
                <p className="text-gray-400 text-xs mt-0.5">{items.length} פריטים</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(true)}
                  className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center"
                >
                  <Search size={18} className="text-gray-600" />
                </button>
                <button
                  onClick={() => setShowAdd(true)}
                  className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center shadow-sm"
                >
                  <Plus size={20} className="text-white" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeCategory === 'all'
                ? 'bg-black text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            הכל ({items.length})
          </button>
          {CLOTHING_CATEGORIES.filter(c => counts[c.value] > 0).map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value as ClothingCategory)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === cat.value
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{t.categories[cat.value as keyof typeof t.categories]}</span>
              <span className={`text-xs rounded-full px-1.5 ${
                activeCategory === cat.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[cat.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4 text-4xl">
              👗
            </div>
            <h3 className="text-lg font-bold text-gray-900">הארון ריק</h3>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              הוסף את הפריט הראשון שלך כדי להתחיל לבנות את הארון הדיגיטלי
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 bg-black text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2"
            >
              <Plus size={18} />
              הוסף פריט ראשון
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-gray-500 mt-3 font-medium">לא נמצאו פריטים</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('all') }}
              className="text-sm text-gray-400 underline mt-2"
            >
              אפס סינון
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onFavorite={toggleFavorite}
                onDelete={() => setDeletingId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            loadItems()
            toast('פריט נוסף לארון! 🎉')
          }}
        />
      )}

      {/* Delete confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 mb-2">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">הסר פריט?</h3>
              <p className="text-sm text-gray-500 mt-1">
                &quot;{deletingItem.name}&quot; יוסר לצמיתות
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
              >
                ביטול
              </button>
              <button
                onClick={() => confirmDelete(deletingItem)}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold"
              >
                הסר
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemCard({
  item,
  onFavorite,
  onDelete,
}: {
  item: WardrobeItem
  onFavorite: (item: WardrobeItem, e: React.MouseEvent) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="aspect-square relative bg-gray-50">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji ?? '👗'}
          </div>
        )}
        {/* Favorite button */}
        <button
          onClick={e => onFavorite(item, e)}
          className="absolute top-2 end-2 w-8 h-8 bg-white/90 backdrop-blur rounded-xl shadow-sm flex items-center justify-center"
        >
          <Heart
            size={15}
            className={
              item.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }
          />
        </button>
        {/* Delete button */}
        <button
          onClick={onDelete}
          className="absolute top-2 start-2 w-8 h-8 bg-white/90 backdrop-blur rounded-xl shadow-sm flex items-center justify-center"
        >
          <Trash2 size={14} className="text-gray-400" />
        </button>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
        {item.brand && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{item.brand}</p>
        )}
        {item.color && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div
              className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-400 truncate font-mono">{item.color}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function AddItemModal({
  onClose,
  onAdded,
}: {
  onClose: () => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ClothingCategory>('tops')
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('#000000')
  const [hasColor, setHasColor] = useState(false)
  const [imageFile, setImageFile] = useState<File | Blob | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [removeBgEnabled, setRemoveBgEnabled] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [processMsg, setProcessMsg] = useState('')
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [step, setStep] = useState<'photo' | 'details'>('photo')
  const supabase = createClient()
  const { t } = useLang()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOriginalFile(file)
    if (removeBgEnabled) processBg(file)
    else {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  async function processBg(file: File) {
    setProcessing(true)
    setProcessMsg('מכין מודל…')
    try {
      const { removeBg } = await import('@/lib/remove-bg')
      const result = await removeBg(file, msg => setProcessMsg(msg))
      setImageFile(result)
      setImagePreview(URL.createObjectURL(result))
    } catch {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    } finally {
      setProcessing(false)
      setProcessMsg('')
    }
  }

  function toggleRemoveBg() {
    const next = !removeBgEnabled
    setRemoveBgEnabled(next)
    if (originalFile) {
      if (next) processBg(originalFile)
      else {
        setImageFile(originalFile)
        setImagePreview(URL.createObjectURL(originalFile))
      }
    }
  }

  async function handleSubmit() {
    if (!name || loading) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let image_url: string | null = null
    if (imageFile) {
      const ext = imageFile.type === 'image/png' ? 'png' : (originalFile?.name.split('.').pop() ?? 'jpg')
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('wardrobe').upload(path, imageFile, {
        contentType: imageFile.type || 'image/jpeg',
      })
      if (!error) {
        const { data } = supabase.storage.from('wardrobe').getPublicUrl(path)
        image_url = data.publicUrl
      }
    }

    await supabase.from('wardrobe_items').insert({
      user_id: user.id,
      name,
      category,
      brand: brand || null,
      color: hasColor ? color : null,
      image_url,
    })
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f9fafb]">
      {/* Modal header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
        >
          <X size={20} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-gray-900">הוסף פריט לארון</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Photo section */}
        <div className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden">
          <label className="block cursor-pointer">
            <div
              className="relative overflow-hidden"
              style={
                imagePreview
                  ? {
                      backgroundImage:
                        'linear-gradient(45deg,#f3f4f6 25%,transparent 25%),linear-gradient(-45deg,#f3f4f6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f3f4f6 75%),linear-gradient(-45deg,transparent 75%,#f3f4f6 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                    }
                  : undefined
              }
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="תצוגה מקדימה"
                  className="w-full h-56 object-contain"
                />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Camera size={28} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">צלם או העלה תמונה</p>
                  <p className="text-xs text-gray-300">JPG, PNG, WEBP</p>
                </div>
              )}
              {processing && (
                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-600 font-medium">{processMsg || 'מסיר רקע…'}</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="sr-only"
              disabled={processing}
            />
          </label>

          {/* Background removal toggle */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
            <span className="text-sm text-gray-700">✂️ הסר רקע אוטומטית</span>
            <button
              type="button"
              onClick={toggleRemoveBg}
              disabled={processing}
              className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 relative ${
                removeBgEnabled ? 'bg-black' : 'bg-gray-200'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  removeBgEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Details section */}
        <div className="bg-white mx-4 mt-3 rounded-2xl overflow-hidden mb-4">
          {/* Category picker */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">קטגוריה</p>
            <div className="grid grid-cols-5 gap-2">
              {CLOTHING_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value as ClothingCategory)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                    category === cat.value
                      ? 'border-black bg-black/5'
                      : 'border-gray-100'
                  }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">
                    {t.categories[cat.value as keyof typeof t.categories]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-4" />

          {/* Name field */}
          <div className="px-4 py-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              שם הפריט *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="לדוג׳ חולצת פשתן לבנה"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
              dir="rtl"
            />
          </div>

          <div className="h-px bg-gray-100 mx-4" />

          {/* Brand field */}
          <div className="px-4 py-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              מותג
            </label>
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="לדוג׳ Zara, H&M…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
              dir="rtl"
            />
          </div>

          <div className="h-px bg-gray-100 mx-4" />

          {/* Color picker */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                צבע
              </label>
              <button
                type="button"
                onClick={() => setHasColor(!hasColor)}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                {hasColor ? '− הסר' : '+ הוסף'}
              </button>
            </div>
            {hasColor && (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white"
                />
                <div className="flex-1">
                  <div
                    className="h-10 rounded-xl border border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                </div>
                <span className="text-sm text-gray-500 font-mono">{color}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="px-4 py-4 bg-white border-t border-gray-100 pb-safe">
        <button
          onClick={handleSubmit}
          disabled={loading || processing || !name}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              מוסיף…
            </>
          ) : (
            <>
              <Check size={20} />
              הוסף לארון
            </>
          )}
        </button>
      </div>
    </div>
  )
}

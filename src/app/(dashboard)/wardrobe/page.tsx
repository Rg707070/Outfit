'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, ClothingCategory } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Heart, Upload, Camera, ImageIcon, Trash2, X } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import { CatalogBrowser } from '@/components/wardrobe/CatalogBrowser'

export default function WardrobePage() {
  type ViewMode = 'mine' | 'discover'
  const [view, setView] = useState<ViewMode>('mine')
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
  const { t } = useLang()
  const supabase = createClient()

  useEffect(() => { loadItems() }, [])

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

  async function toggleFavorite(item: WardrobeItem) {
    await supabase.from('wardrobe_items').update({ is_favorite: !item.is_favorite }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i))
    toast(item.is_favorite ? 'הוסר מהמועדפים' : 'נוסף למועדפים ❤️')
  }

  async function confirmDelete(item: WardrobeItem) {
    await supabase.from('wardrobe_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setDeletingId(null)
    toast('הפריט הוסר מהארון', 'info')
  }

  const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.brand?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const counts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const knownCategoryValues = new Set<string>(CLOTHING_CATEGORIES.map(c => c.value))
  const customCategories = [...new Set(items.map(i => i.category).filter(c => !knownCategoryValues.has(c)))]

  const deletingItem = deletingId ? items.find(i => i.id === deletingId) : null

  return (
    <div className="min-h-screen pb-24 md:pb-8">

      {/* ── Header — sticky below the 56px mobile nav, NO backdrop-blur/z-index to avoid sidebar stacking context issues ── */}
      <div className="sticky top-14 md:static -mx-4 px-4 pt-3 pb-3 bg-[#fafaf9] border-b border-stone-100 md:border-none md:bg-transparent md:mx-0 md:px-0 md:pt-0 md:pb-0">

        {/* Title row */}
        <div className="flex items-center justify-between mb-3 md:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight leading-tight truncate">
              {t.wardrobe.title}
            </h1>
            <p className="text-stone-400 text-xs mt-0.5 md:text-sm">
              {t.wardrobe.itemsTotal(items.length)}
            </p>
          </div>

          {/* Desktop: add button */}
          {view === 'mine' && (
            <button
              onClick={() => setShowAdd(true)}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-sm font-medium shadow-sm hover:bg-stone-800 transition-colors flex-shrink-0"
            >
              <Plus size={15} strokeWidth={2.5} />
              {t.wardrobe.addItem}
            </button>
          )}
        </div>

        {/* View toggle — My Wardrobe / Discover */}
        <div className="flex gap-1 p-1 bg-stone-100 rounded-2xl w-fit mb-3">
          <button
            onClick={() => setView('mine')}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${view === 'mine' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t.catalog.myWardrobe}
          </button>
          <button
            onClick={() => setView('discover')}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${view === 'discover' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t.catalog.discover}
          </button>
        </div>

        {/* Search bar — always visible on mobile */}
        <div className="relative mb-3 md:mb-6">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t.wardrobe.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full ps-9 pe-8 py-2.5 text-sm rounded-xl border border-stone-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 placeholder:text-stone-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-stone-200 text-stone-500 hover:bg-stone-300 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Category strip — forced LTR so "הכל" is always visible on the left */}
        <div
          className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 md:flex-wrap md:gap-2"
          style={{ direction: 'ltr' }}
        >
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <span style={{ direction: 'rtl' }}>{t.wardrobe.all(items.length)}</span>
          </button>

          {CLOTHING_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
                activeCategory === cat.value
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>{cat.emoji}</span>
              <span style={{ direction: 'rtl' }}>
                {t.categories[cat.value as keyof typeof t.categories] ?? cat.label}
              </span>
              {counts[cat.value] > 0 && (
                <span className={`text-xs rounded-full px-1.5 min-w-[20px] text-center ${
                  activeCategory === cat.value ? 'bg-white/20' : 'bg-stone-100'
                }`}>
                  {counts[cat.value]}
                </span>
              )}
            </button>
          ))}

          {customCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span style={{ direction: 'rtl' }}>{cat}</span>
              {counts[cat] > 0 && (
                <span className={`text-xs rounded-full px-1.5 min-w-[20px] text-center ${
                  activeCategory === cat ? 'bg-white/20' : 'bg-stone-100'
                }`}>
                  {counts[cat]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Discover view ── */}
      {view === 'discover' && (
        <div className="mt-4">
          <CatalogBrowser
            category={activeCategory as ClothingCategory | 'all'}
            search={search}
            onImported={() => { loadItems(); toast((t.catalog?.addToWardrobe ?? 'נוסף לארון') + ' ✅') }}
          />
        </div>
      )}

      {/* ── Grid (mine) ── */}
      {view === 'mine' && <div className="mt-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-stone-100 rounded-2xl animate-shimmer" />
            ))}
          </div>

        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center px-6">
            <div className="w-24 h-24 bg-gradient-to-br from-stone-100 to-stone-50 rounded-3xl flex items-center justify-center shadow-sm mb-5">
              <span className="text-5xl">👗</span>
            </div>
            <p className="text-stone-800 text-lg font-bold">{t.wardrobe.noItems}</p>
            <p className="text-stone-400 text-sm mt-1 max-w-xs leading-relaxed">{t.wardrobe.noItemsSub}</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-full text-sm font-medium shadow-sm active:scale-95 transition-transform"
            >
              <Plus size={15} />
              {t.wardrobe.addFirstItem}
            </button>
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center px-6">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-3">
              <span className="text-3xl">🔍</span>
            </div>
            <p className="text-stone-600 font-semibold">{t.wardrobe.noItems}</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('all') }}
              className="mt-3 text-sm text-stone-400 hover:text-stone-700 underline transition-colors"
            >
              {t.wardrobe.all(0)}
            </button>
          </div>

        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
            {filtered.map((item, idx) => (
              <WardrobeCard
                key={item.id}
                item={item}
                index={idx}
                onFavorite={() => toggleFavorite(item)}
                onDelete={() => setDeletingId(item.id)}
              />
            ))}
          </div>
        )}
      </div>}

      {/* ── FAB — mobile only, mine view only ── */}
      {view === 'mine' && <button
        onClick={() => setShowAdd(true)}
        aria-label={t.wardrobe.addItem}
        className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-stone-900 text-white rounded-full shadow-xl shadow-stone-900/25 flex items-center justify-center z-30 active:scale-90 transition-all duration-150"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>}

      {/* ── Add item sheet ── */}
      {showAdd && (
        <AddItemSheet
          onClose={() => setShowAdd(false)}
          onAdded={() => { loadItems(); toast('הפריט נוסף לארון! 🎉') }}
          t={t}
        />
      )}

      {/* ── Delete sheet ── */}
      {deletingItem && (
        <DeleteSheet
          item={deletingItem}
          onCancel={() => setDeletingId(null)}
          onConfirm={() => confirmDelete(deletingItem)}
          cancelLabel={t.wardrobe.cancel}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Wardrobe Card
───────────────────────────────────────── */
function WardrobeCard({
  item, index, onFavorite, onDelete
}: {
  item: WardrobeItem
  index: number
  onFavorite: () => void
  onDelete: () => void
}) {
  const emoji = CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji ?? '👗'

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-stone-100 shadow-sm active:scale-[0.98] md:hover:-translate-y-1 md:hover:shadow-lg md:hover:shadow-stone-200/60 transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
    >
      <div className="aspect-[3/4] relative">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
            <span className="text-5xl opacity-60">{emoji}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />

        {/* Action buttons */}
        <div className="absolute top-2 end-2 flex flex-col gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onFavorite() }}
            className="w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm active:scale-90 transition-transform"
          >
            <Heart size={13} className={item.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-stone-400'} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm active:scale-90 transition-transform md:opacity-0 md:group-hover:opacity-100"
          >
            <Trash2 size={13} className="text-stone-400" />
          </button>
        </div>

        {/* Item info overlay */}
        <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2.5">
          <p className="text-xs font-semibold text-white truncate leading-tight drop-shadow">{item.name}</p>
          {item.brand && (
            <p className="text-xs text-white/70 truncate leading-tight">{item.brand}</p>
          )}
        </div>
      </div>

      {/* Color chip — only shown when no image */}
      {!item.image_url && item.color && (
        <div className="px-2.5 py-2 flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-stone-200 flex-shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-xs text-stone-400 truncate">{item.color}</span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Add Item Sheet
───────────────────────────────────────── */
function AddItemSheet({
  onClose, onAdded, t
}: {
  onClose: () => void
  onAdded: () => void
  t: ReturnType<typeof useLang>['t']
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('tops')
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
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
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOriginalFile(file)
    if (removeBgEnabled) processBg(file)
    else { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }
  }

  async function processBg(file: File) {
    setProcessing(true)
    setProcessMsg(t.wardrobe.loadingModel)
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
      else { setImageFile(originalFile); setImagePreview(URL.createObjectURL(originalFile)) }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

    const finalCategory = showCustomInput && customCategory.trim() ? customCategory.trim() : category

    await supabase.from('wardrobe_items').insert({
      user_id: user.id,
      name,
      category: finalCategory,
      brand: brand || null,
      color: hasColor ? color : null,
      image_url,
    })
    onAdded()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4 animate-sheet-up">
        <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md shadow-2xl shadow-stone-900/20 max-h-[92dvh] md:max-h-[90vh] flex flex-col">

          {/* Drag handle */}
          <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-9 h-1 bg-stone-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
            <h2 className="text-base font-semibold text-stone-900">{t.wardrobe.modalTitle}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Image upload */}
            <div>
              <div
                className={`rounded-2xl flex items-center justify-center transition-colors relative overflow-hidden ${
                  imagePreview ? 'border-0' : 'border-2 border-dashed border-stone-200 h-44'
                }`}
                style={imagePreview ? {
                  backgroundImage: 'linear-gradient(45deg,#f3f4f6 25%,transparent 25%),linear-gradient(-45deg,#f3f4f6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f3f4f6 75%),linear-gradient(-45deg,transparent 75%,#f3f4f6 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                } : undefined}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="תצוגה מקדימה" className="w-full h-44 object-contain" />
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Upload size={20} className="text-stone-400" />
                    </div>
                    <p className="text-sm text-stone-600 font-medium">{t.wardrobe.uploadPhoto}</p>
                    <p className="text-xs text-stone-400 mt-0.5">JPG, PNG, WEBP</p>
                  </div>
                )}
                {processing && (
                  <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-stone-600">{processMsg || t.wardrobe.removingBg}</p>
                  </div>
                )}
              </div>

              {/* Camera / Gallery / Unsplash buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  <Camera size={14} />
                  מצלמה
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  <ImageIcon size={14} />
                  גלריה
                </button>
              </div>

              {/* Hidden inputs */}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="sr-only" disabled={processing} />
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFile} className="sr-only" disabled={processing} />
            </div>

            {/* Remove background toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={toggleRemoveBg}
                disabled={processing}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${removeBgEnabled ? 'bg-stone-900' : 'bg-stone-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${removeBgEnabled ? 'left-5' : 'left-1'}`} />
              </button>
              <span className="text-sm text-stone-700">{t.wardrobe.removeBgToggle}</span>
            </label>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                {t.wardrobe.nameLabel}
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.wardrobe.namePlaceholder}
                required
              />
            </div>

            {/* Category — pill picker */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                {t.wardrobe.categoryLabel}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CLOTHING_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => { setCategory(cat.value); setShowCustomInput(false) }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                      !showCustomInput && category === cat.value
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 active:scale-95'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    {t.categories[cat.value as keyof typeof t.categories] ?? cat.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setShowCustomInput(true); setCategory('') }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                    showCustomInput
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 active:scale-95'
                  }`}
                >
                  ✏️ תחום חדש
                </button>
              </div>
              {showCustomInput && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="שם התחום החדש..."
                  className="mt-2 w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400 placeholder:text-stone-400"
                  autoFocus
                />
              )}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                {t.wardrobe.brandLabel}
              </label>
              <Input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder={t.wardrobe.brandPlaceholder}
              />
            </div>

            {/* Color */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  {t.wardrobe.colorLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setHasColor(!hasColor)}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
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
                    className="w-10 h-10 rounded-xl border border-stone-200 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-sm text-stone-600 font-mono">{color}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 active:scale-[0.98] transition-all"
              >
                {t.wardrobe.cancel}
              </button>
              <button
                type="submit"
                disabled={loading || processing || !name}
                className="flex-1 py-3 rounded-xl bg-stone-900 text-white text-sm font-medium shadow-sm disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {loading ? t.wardrobe.adding : t.wardrobe.addItemBtn}
              </button>
            </div>
          </form>
        </div>
      </div>

    </>
  )
}

/* ─────────────────────────────────────────
   Delete Confirmation Sheet
───────────────────────────────────────── */
function DeleteSheet({
  item, onCancel, onConfirm, cancelLabel
}: {
  item: WardrobeItem
  onCancel: () => void
  onConfirm: () => void
  cancelLabel: string
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onCancel} />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4 animate-sheet-up">
        <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-sm shadow-xl shadow-stone-900/15 p-6">
          <div className="md:hidden flex justify-center mb-5">
            <div className="w-9 h-1 bg-stone-200 rounded-full" />
          </div>
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Trash2 size={17} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 leading-tight">הסרת פריט</h3>
              <p className="text-sm text-stone-500 mt-0.5">"{item.name}"</p>
              <p className="text-xs text-stone-400 mt-1">הפריט יוסר לצמיתות מהארון שלך</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 active:scale-[0.98] transition-all"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium shadow-sm hover:bg-red-600 active:scale-[0.98] transition-all"
            >
              הסר
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

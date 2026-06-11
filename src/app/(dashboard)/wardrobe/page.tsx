'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, ClothingCategory } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Heart, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all')
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
    toast(item.is_favorite ? t.wardrobe.favRemoved : t.wardrobe.favAdded)
  }

  async function confirmDelete(item: WardrobeItem) {
    await supabase.from('wardrobe_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setDeletingId(null)
    toast(t.wardrobe.removedToast, 'info')
  }

  const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.brand?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const counts = CLOTHING_CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = items.filter(i => i.category === cat.value).length
    return acc
  }, {} as Record<string, number>)

  const deletingItem = deletingId ? items.find(i => i.id === deletingId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.wardrobe.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.wardrobe.itemsTotal(items.length)}</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t.wardrobe.addItem}
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeCategory === 'all' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {t.wardrobe.all(items.length)}
        </button>
        {CLOTHING_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value as ClothingCategory)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeCategory === cat.value ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{cat.emoji}</span>
            {t.categories[cat.value as keyof typeof t.categories] ?? cat.label}
            {counts[cat.value] > 0 && (
              <span className={`text-xs rounded-full px-1.5 ${activeCategory === cat.value ? 'bg-white/20' : 'bg-gray-100'}`}>
                {counts[cat.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={t.wardrobe.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">👗</span>
          <p className="text-gray-500 mt-4 text-lg font-medium">{t.wardrobe.noItems}</p>
          <p className="text-gray-400 text-sm mt-1">{t.wardrobe.noItemsSub}</p>
          <Button className="mt-6" onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            {t.wardrobe.addFirstItem}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl">🔍</span>
          <p className="text-gray-500 mt-3 font-medium">{t.wardrobe.noResults}</p>
          <button onClick={() => { setSearch(''); setActiveCategory('all') }} className="text-sm text-gray-400 underline mt-2">
            {t.wardrobe.clearFilters}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-50 relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl">
                      {CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji ?? '👗'}
                    </span>
                  </div>
                )}
                {/* Action buttons — always visible on mobile, hover on desktop */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleFavorite(item)}
                    className="p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
                    title={item.is_favorite ? t.wardrobe.favoriteRemove : t.wardrobe.favoriteAdd}
                  >
                    <Heart size={12} className={item.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                  </button>
                  <button
                    onClick={() => setDeletingId(item.id)}
                    className="p-1.5 bg-white rounded-full shadow-sm hover:bg-red-50 hover:scale-110 transition-all"
                    title={t.wardrobe.removeItemTitle}
                  >
                    <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
                {item.is_favorite && (
                  <div className="absolute top-2 left-2">
                    <Heart size={14} className="fill-red-500 text-red-500" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                {item.brand && <p className="text-xs text-gray-400 truncate">{item.brand}</p>}
                {item.color && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-400 truncate">{item.color}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { loadItems(); toast(t.wardrobe.addedToast) }}
        />
      )}

      {/* Delete confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t.wardrobe.deleteTitle}</h3>
                <p className="text-sm text-gray-500">"{deletingItem.name}"</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeletingId(null)}>{t.wardrobe.cancel}</Button>
              <Button variant="danger" className="flex-1" onClick={() => confirmDelete(deletingItem)}>{t.wardrobe.remove}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddItemModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { t } = useLang()
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
  const supabase = createClient()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOriginalFile(file)
    if (removeBgEnabled) {
      processBg(file)
    } else {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
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
      const ext = imageFile.type === 'image/png' ? 'png'
        : (originalFile?.name.split('.').pop() ?? 'jpg')
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold">{t.wardrobe.modalTitle}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image upload */}
          <label className="block">
            <div
              className={`border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${
                imagePreview ? 'border-transparent' : 'border-gray-200 hover:border-gray-300 h-40'
              }`}
              style={imagePreview ? {
                backgroundImage: 'linear-gradient(45deg,#f3f4f6 25%,transparent 25%),linear-gradient(-45deg,#f3f4f6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f3f4f6 75%),linear-gradient(-45deg,transparent 75%,#f3f4f6 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
              } : undefined}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-contain" />
              ) : (
                <div className="text-center">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">{t.wardrobe.uploadPhoto}</p>
                  <p className="text-xs text-gray-400 mt-1">{t.wardrobe.photoFormats}</p>
                </div>
              )}
              {processing && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-600 mt-2">{processMsg || t.wardrobe.removingBg}</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleFile} className="sr-only" disabled={processing} />
          </label>

          {/* Background removal toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={toggleRemoveBg}
              disabled={processing}
              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${removeBgEnabled ? 'bg-black' : 'bg-gray-200'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${removeBgEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-gray-700">{t.wardrobe.removeBgAuto}</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.wardrobe.nameLabel} <span className="text-red-500">*</span>
            </label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.wardrobe.namePlaceholder} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.wardrobe.categoryLabel} <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ClothingCategory)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {CLOTHING_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.emoji} {t.categories[c.value as keyof typeof t.categories]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.wardrobe.brandLabel}</label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder={t.wardrobe.brandPlaceholder} />
          </div>

          {/* Color picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">{t.wardrobe.colorLabel}</label>
              <button
                type="button"
                onClick={() => setHasColor(!hasColor)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {hasColor ? t.wardrobe.removeColor : t.wardrobe.addColor}
              </button>
            </div>
            {hasColor && (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                />
                <span className="text-sm text-gray-600 font-mono">{color}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t.wardrobe.cancel}</Button>
            <Button type="submit" disabled={loading || processing || !name} className="flex-1">
              {loading ? t.wardrobe.adding : t.wardrobe.addItemBtn}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

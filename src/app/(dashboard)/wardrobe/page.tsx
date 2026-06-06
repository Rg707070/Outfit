'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, ClothingCategory } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, Heart, Upload } from 'lucide-react'

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadItems()
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

  async function toggleFavorite(item: WardrobeItem) {
    await supabase.from('wardrobe_items').update({ is_favorite: !item.is_favorite }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i))
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wardrobe</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} items total</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add item
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
          All ({items.length})
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
            {cat.label}
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
          placeholder="Search by name or brand…"
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">👗</span>
          <p className="text-gray-500 mt-4 text-lg font-medium">No items yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first clothing item to get started</p>
          <Button className="mt-6" onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add first item
          </Button>
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
                <button
                  onClick={() => toggleFavorite(item)}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Heart
                    size={14}
                    className={item.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                  />
                </button>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                {item.brand && <p className="text-xs text-gray-400 truncate">{item.brand}</p>}
                {item.color && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-gray-200"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-400">{item.color}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} onAdded={loadItems} />}
    </div>
  )
}

function AddItemModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ClothingCategory>('tops')
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let image_url: string | null = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('wardrobe').upload(path, imageFile)
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
      color: color || null,
      image_url,
    })
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Add clothing item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image upload */}
          <label className="block">
            <div className={`border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer transition-colors ${
              imagePreview ? 'border-transparent' : 'border-gray-200 hover:border-gray-300 h-40'
            }`}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-2xl" />
              ) : (
                <div className="text-center">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-400">Upload photo</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. White linen shirt" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ClothingCategory)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {CLOTHING_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand</label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Zara" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
              <Input value={color} onChange={e => setColor(e.target.value)} placeholder="e.g. #ffffff" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading || !name} className="flex-1">
              {loading ? 'Adding…' : 'Add item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

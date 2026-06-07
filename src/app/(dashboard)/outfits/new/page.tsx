'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, ClothingCategory, Season } from '@/types/database'
import { CLOTHING_CATEGORIES, SEASONS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Check, ArrowLeft, Sparkles, X } from 'lucide-react'
import Link from 'next/link'

export default function NewOutfitPage() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [selected, setSelected] = useState<Record<string, WardrobeItem>>({})
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [occasion, setOccasion] = useState('')
  const [season, setSeason] = useState<Season | ''>('')
  const [isPublic, setIsPublic] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', user.id)
        .order('category')
      setItems(data ?? [])
      setLoading(false)
    })()
  }, [])

  function toggleItem(item: WardrobeItem) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[item.id]) delete next[item.id]
      else next[item.id] = item
      return next
    })
  }

  async function handleSave() {
    const selectedItems = Object.values(selected)
    if (!name || selectedItems.length === 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: outfit, error } = await supabase
      .from('outfits')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        occasion: occasion || null,
        season: (season || null) as Season | null,
        is_public: isPublic,
        image_url: selectedItems.find(i => i.image_url)?.image_url ?? null,
      })
      .select()
      .single()

    if (error || !outfit) { setSaving(false); return }

    await supabase.from('outfit_items').insert(
      selectedItems.map((item, idx) => ({
        outfit_id: outfit.id,
        wardrobe_item_id: item.id,
        z_index: idx,
      }))
    )

    router.push('/outfits')
  }

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory)
  const selectedList = Object.values(selected)

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* Left: item picker */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/outfits"><Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">בנה לוק</h1>
            <p className="text-gray-500 text-sm">בחר פריטים מהארון שלך</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeCategory === 'all' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >הכל</button>
          {CLOTHING_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value as ClothingCategory)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeCategory === cat.value ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{cat.emoji}</span>{cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-4xl">👗</span>
              <p className="text-gray-500 mt-3">אין פריטים בקטגוריה זו.</p>
              <Link href="/wardrobe"><Button className="mt-4" variant="secondary">עבור לארון</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(item => {
                const isSel = !!selected[item.id]
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      isSel ? 'border-black ring-2 ring-black/10' : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji}</span>
                      )}
                    </div>
                    {isSel && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white font-medium truncate text-right">{item.name}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: outfit preview + details */}
      <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles size={16} /> הלוק שלך
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{selectedList.length} פריט{selectedList.length !== 1 && 'ים'} נבחרו</p>
        </div>

        {/* Flat-lay preview */}
        <div className="p-5 flex-1 overflow-y-auto">
          {selectedList.length === 0 ? (
            <div className="h-40 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
              <p className="text-sm text-gray-400 text-center px-4">בחר פריטים לתצוגה מקדימה</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {selectedList.map(item => (
                <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji}</span>
                  )}
                  <button
                    onClick={() => toggleItem(item)}
                    className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <Input placeholder="שם הלוק *" value={name} onChange={e => setName(e.target.value)} />
            <textarea
              placeholder="תיאור"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
            <Input placeholder="אירוע (לדוג׳ עבודה, דייט)" value={occasion} onChange={e => setOccasion(e.target.value)} />
            <select
              value={season}
              onChange={e => setSeason(e.target.value as Season)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">כל עונה</option>
              {SEASONS.map(s => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
            </select>
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${isPublic ? 'bg-black' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${isPublic ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm text-gray-700">אפשר שיתוף (קישור ציבורי)</span>
            </label>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100">
          <Button
            onClick={handleSave}
            disabled={saving || !name || selectedList.length === 0}
            className="w-full"
            size="lg"
          >
            {saving ? 'שומר…' : 'שמור לוק'}
          </Button>
        </div>
      </div>
    </div>
  )
}

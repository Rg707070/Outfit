'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShoppingItem, ClothingCategory } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Plus, ShoppingBag, Star, Check, ExternalLink, Trash2, X } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export default function WishlistPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen pb-nav"/>}>
      <WishlistPage />
    </Suspense>
  )
}

function WishlistPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'shopping' | 'wishlist'>('shopping')
  const [showAdd, setShowAdd] = useState(false)
  const { toast } = useToast()
  const { t } = useLang()
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    loadItems()
    if (searchParams.get('tab') === 'wishlist') setTab('wishlist')
  }, [])

  async function loadItems() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  async function togglePurchased(item: ShoppingItem) {
    await supabase.from('shopping_list').update({ is_purchased: !item.is_purchased }).eq('id', item.id)
    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i))
    )
    toast(item.is_purchased ? 'מסומן כלא נרכש' : 'נרכש! 🎉')
  }

  async function deleteItem(id: string) {
    await supabase.from('shopping_list').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    toast('פריט הוסר', 'info')
  }

  const filtered = items.filter(i => (tab === 'wishlist' ? i.is_wishlist : !i.is_wishlist))
  const shoppingCount = items.filter(i => !i.is_wishlist).length
  const wishlistCount = items.filter(i => i.is_wishlist).length
  const purchasedCount = items.filter(i => !i.is_wishlist && i.is_purchased).length

  return (
    <div className="min-h-screen pb-nav">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">קניות ומשאלות</h1>
            {tab === 'shopping' && shoppingCount > 0 && (
              <p className="text-gray-400 text-xs mt-0.5">
                {purchasedCount} מתוך {shoppingCount} נרכשו
              </p>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center shadow-sm"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTab('shopping')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'shopping' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <ShoppingBag size={15} />
            קניות ({shoppingCount})
          </button>
          <button
            onClick={() => setTab('wishlist')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'wishlist' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Star size={15} className={tab === 'wishlist' ? 'fill-white' : ''} />
            ווישליסט ({wishlistCount})
          </button>
        </div>
      </div>

      <div className="px-4 mt-3 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4 text-4xl">
              {tab === 'wishlist' ? '⭐' : '🛍️'}
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {tab === 'wishlist' ? 'רשימת משאלות ריקה' : 'רשימת קניות ריקה'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {tab === 'wishlist' ? 'הוסף חפצי חמדה שאתה רוצה' : 'הוסף פריטים לקנייה'}
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 bg-black text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2"
            >
              <Plus size={18} />
              הוסף פריט
            </button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            {tab === 'shopping' && shoppingCount > 0 && (
              <div className="bg-white rounded-2xl px-4 py-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">התקדמות</span>
                  <span className="text-xs font-bold text-gray-900">
                    {Math.round((purchasedCount / shoppingCount) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${(purchasedCount / shoppingCount) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {filtered.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3.5 shadow-sm transition-opacity ${
                  item.is_purchased ? 'opacity-60' : ''
                }`}
              >
                {!item.is_wishlist && (
                  <button
                    onClick={() => togglePurchased(item)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      item.is_purchased
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {item.is_purchased && <Check size={12} className="text-white" />}
                  </button>
                )}
                {item.is_wishlist && (
                  <Star size={18} className="flex-shrink-0 fill-yellow-400 text-yellow-400" />
                )}
                <div className="flex-1 min-w-0 text-right">
                  <p
                    className={`text-sm font-semibold truncate ${
                      item.is_purchased ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-end">
                    {item.brand && (
                      <span className="text-xs text-gray-400">{item.brand}</span>
                    )}
                    {item.price && (
                      <span className="text-xs font-bold text-gray-700">₪{item.price}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { loadItems(); toast('פריט נוסף! 🎉') }}
          defaultWishlist={tab === 'wishlist'}
        />
      )}
    </div>
  )
}

function AddModal({
  onClose,
  onAdded,
  defaultWishlist,
}: {
  onClose: () => void
  onAdded: () => void
  defaultWishlist: boolean
}) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<ClothingCategory | ''>('')
  const [isWishlist, setIsWishlist] = useState(defaultWishlist)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    if (!name || loading) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('shopping_list').insert({
      user_id: user.id,
      name,
      brand: brand || null,
      price: price ? parseFloat(price) : null,
      url: url || null,
      category: (category || null) as ClothingCategory | null,
      is_wishlist: isWishlist,
    })
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f9fafb]">
      <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
        >
          <X size={20} />
        </button>
        <h2 className="font-bold text-gray-900">הוסף פריט</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Type toggle */}
        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <button
            onClick={() => setIsWishlist(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              !isWishlist ? 'bg-black text-white' : 'text-gray-500'
            }`}
          >
            🛍️ קניות
          </button>
          <button
            onClick={() => setIsWishlist(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isWishlist ? 'bg-black text-white' : 'text-gray-500'
            }`}
          >
            ⭐ ווישליסט
          </button>
        </div>

        <div className="bg-white rounded-2xl px-4 py-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              שם הפריט *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="לדוג׳ ג׳קט עור שחור"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                מותג
              </label>
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Zara"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
                dir="rtl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                מחיר (₪)
              </label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              קישור
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              קטגוריה
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ClothingCategory)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
              dir="rtl"
            >
              <option value="">בחר קטגוריה</option>
              {CLOTHING_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 bg-white border-t border-gray-100 pb-safe">
        <button
          onClick={handleSubmit}
          disabled={loading || !name}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check size={20} />
              הוסף פריט
            </>
          )}
        </button>
      </div>
    </div>
  )
}

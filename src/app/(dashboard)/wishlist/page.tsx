'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingItem, ClothingCategory } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ShoppingBag, Star, Check, ExternalLink, Trash2 } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export default function WishlistPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'shopping' | 'wishlist'>('shopping')
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()
  const { t } = useLang()

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('shopping_list').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  async function togglePurchased(item: ShoppingItem) {
    await supabase.from('shopping_list').update({ is_purchased: !item.is_purchased }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i))
  }

  async function deleteItem(id: string) {
    await supabase.from('shopping_list').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const filtered = items.filter(i => tab === 'wishlist' ? i.is_wishlist : !i.is_wishlist)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.wishlist.title}</h1>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} />{t.wishlist.addItem}</Button>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'shopping', label: t.wishlist.shoppingTab, icon: ShoppingBag },
          { key: 'wishlist', label: t.wishlist.wishlistTab, icon: Star },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as 'shopping' | 'wishlist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === key ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={16} />
            {label}
            <span className={`text-xs rounded-full px-1.5 ${tab === key ? 'bg-white/20' : 'bg-gray-100'}`}>
              {items.filter(i => key === 'wishlist' ? i.is_wishlist : !i.is_wishlist).length}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">{tab === 'wishlist' ? '⭐' : '🛍️'}</span>
            <p className="text-gray-500 mt-3 font-medium">{tab === 'wishlist' ? t.wishlist.wishlistEmpty : t.wishlist.shoppingEmpty}</p>
            <Button className="mt-4" onClick={() => setShowAdd(true)}><Plus size={16} />{t.wishlist.addItem}</Button>
          </div>
        ) : filtered.map(item => (
          <div key={item.id} className={`flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 ${item.is_purchased ? 'opacity-50' : ''}`}>
            <button onClick={() => togglePurchased(item)}
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.is_purchased ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-black'}`}>
              {item.is_purchased && <Check size={12} className="text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium text-gray-900 ${item.is_purchased ? 'line-through' : ''}`}>{item.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.brand && <span className="text-xs text-gray-400">{item.brand}</span>}
                {item.category && <span className="text-xs text-gray-400">· {t.categories[item.category as keyof typeof t.categories]}</span>}
                {item.price && <span className="text-xs text-gray-400">· ₪{item.price}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-gray-600"><ExternalLink size={14} /></a>}
              <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <AddShoppingModal onClose={() => setShowAdd(false)} onAdded={loadItems} defaultWishlist={tab === 'wishlist'} />}
    </div>
  )
}

function AddShoppingModal({ onClose, onAdded, defaultWishlist }: { onClose: () => void; onAdded: () => void; defaultWishlist: boolean }) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<ClothingCategory | ''>('')
  const [isWishlist, setIsWishlist] = useState(defaultWishlist)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { t } = useLang()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('shopping_list').insert({
      user_id: user.id, name, brand: brand || null, price: price ? parseFloat(price) : null,
      url: url || null, category: (category || null) as ClothingCategory | null, is_wishlist: isWishlist,
    })
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{t.wishlist.modalTitle}</h2>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.wishlist.itemName}</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.wishlist.itemPlaceholder} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.wishlist.brand}</label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Zara" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.wishlist.price}</label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.wishlist.link}</label>
            <Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.wishlist.category}</label>
            <select value={category} onChange={e => setCategory(e.target.value as ClothingCategory)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black">
              <option value="">{t.wishlist.selectCategory}</option>
              {CLOTHING_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {t.categories[c.value as keyof typeof t.categories]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsWishlist(!isWishlist)}
              className={`w-10 h-6 rounded-full transition-colors ${isWishlist ? 'bg-black' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${isWishlist ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-gray-700">{t.wishlist.addToWishlist}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t.wishlist.cancel}</Button>
            <Button type="submit" disabled={loading || !name} className="flex-1">{loading ? t.wishlist.adding : t.wishlist.addBtn}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

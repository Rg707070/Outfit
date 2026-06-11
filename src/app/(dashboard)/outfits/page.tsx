'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Outfit, WardrobeItem } from '@/types/database'
import { useToast } from '@/components/ui/toast'
import {
  Plus, Heart, Share2, Calendar, Trash2, Zap, X, Eye,
} from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'
import { CLOTHING_CATEGORIES } from '@/lib/utils'

type TabType = 'all' | 'favorites'

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingOutfit, setViewingOutfit] = useState<Outfit | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const { toast } = useToast()
  const { t } = useLang()
  const supabase = createClient()

  useEffect(() => { loadOutfits() }, [])

  async function loadOutfits() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('outfits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setOutfits(data ?? [])
    setLoading(false)
  }

  async function toggleFavorite(outfit: Outfit) {
    await supabase.from('outfits').update({ is_favorite: !outfit.is_favorite }).eq('id', outfit.id)
    setOutfits(prev =>
      prev.map(o => (o.id === outfit.id ? { ...o, is_favorite: !o.is_favorite } : o))
    )
    toast(outfit.is_favorite ? 'הוסר מהמועדפים' : 'נוסף למועדפים ❤️')
  }

  async function shareOutfit(outfit: Outfit) {
    if (!outfit.is_public) {
      await supabase.from('outfits').update({ is_public: true }).eq('id', outfit.id)
      setOutfits(prev =>
        prev.map(o => (o.id === outfit.id ? { ...o, is_public: true } : o))
      )
    }
    const url = `${window.location.origin}/share/${outfit.share_token}`
    await navigator.clipboard.writeText(url)
    toast('קישור השיתוף הועתק! 🔗')
  }

  async function confirmDelete(outfit: Outfit) {
    await supabase.from('outfits').delete().eq('id', outfit.id)
    setOutfits(prev => prev.filter(o => o.id !== outfit.id))
    setDeletingId(null)
    toast('הלוק נמחק', 'info')
  }

  async function scheduleToday(outfit: Outfit) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('calendar_outfits').upsert(
      { user_id: user.id, outfit_id: outfit.id, date: today },
      { onConflict: 'user_id,date' }
    )
    toast(`"${outfit.name}" שויך להיום! 📅`)
  }

  const displayed = outfits.filter(o => activeTab === 'favorites' ? o.is_favorite : true)
  const deletingOutfit = deletingId ? outfits.find(o => o.id === deletingId) : null

  return (
    <div className="min-h-screen pb-nav">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">הלוקים שלי</h1>
            <p className="text-gray-400 text-xs mt-0.5">{outfits.length} לוקים שמורים</p>
          </div>
          <Link href="/outfits/new">
            <button className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center shadow-sm">
              <Plus size={20} className="text-white" />
            </button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            כל הלוקים ({outfits.length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'favorites' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Heart size={14} className={activeTab === 'favorites' ? 'fill-white text-white' : ''} />
            מועדפים ({outfits.filter(o => o.is_favorite).length})
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4 mt-3">
        {/* Discover banner */}
        <Link href="/outfits/discover">
          <div className="flex items-center gap-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-2xl p-4 active:scale-98 transition-transform">
            <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={20} className="text-yellow-300" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">גלה לוקים אוטומטיים</p>
              <p className="text-white/60 text-xs mt-0.5">קיבוצים חכמים מהארון שלך</p>
            </div>
            <span className="text-white/40 text-lg">←</span>
          </div>
        </Link>

        {/* Outfits grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-56 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4 text-4xl">
              ✨
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {activeTab === 'favorites' ? 'אין מועדפים עדיין' : 'אין לוקים עדיין'}
            </h3>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">
              {activeTab === 'favorites'
                ? 'לחץ על לב בלוק כדי לשמור אותו כאן'
                : 'צור לוק חדש מהבגדים שבארון שלך'}
            </p>
            {activeTab === 'all' && (
              <Link href="/outfits/new">
                <button className="mt-6 bg-black text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2">
                  <Plus size={18} />
                  צור לוק ראשון
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayed.map(outfit => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onToggleFavorite={toggleFavorite}
                onShare={shareOutfit}
                onDelete={() => setDeletingId(outfit.id)}
                onScheduleToday={scheduleToday}
                onView={() => setViewingOutfit(outfit)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deletingOutfit && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 mb-2">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">מחק לוק?</h3>
              <p className="text-sm text-gray-500 mt-1">
                &quot;{deletingOutfit.name}&quot; יוסר לצמיתות
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
                onClick={() => confirmDelete(deletingOutfit)}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outfit view modal */}
      {viewingOutfit && (
        <OutfitViewModal
          outfit={viewingOutfit}
          onClose={() => setViewingOutfit(null)}
          onSchedule={scheduleToday}
          onShare={shareOutfit}
        />
      )}
    </div>
  )
}

function OutfitCard({
  outfit,
  onToggleFavorite,
  onShare,
  onDelete,
  onScheduleToday,
  onView,
}: {
  outfit: Outfit
  onToggleFavorite: (o: Outfit) => void
  onShare: (o: Outfit) => void
  onDelete: (o: Outfit) => void
  onScheduleToday: (o: Outfit) => void
  onView: () => void
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Image area */}
      <div
        className="h-44 bg-gradient-to-br from-gray-50 to-gray-100 relative cursor-pointer"
        onClick={onView}
      >
        {outfit.image_url ? (
          <img
            src={outfit.image_url}
            alt={outfit.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">👔</div>
        )}
        {/* Action buttons */}
        <div className="absolute top-2 end-2 flex flex-col gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(outfit) }}
            className="w-8 h-8 bg-white/90 backdrop-blur rounded-xl shadow-sm flex items-center justify-center"
          >
            <Heart
              size={15}
              className={outfit.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onShare(outfit) }}
            className="w-8 h-8 bg-white/90 backdrop-blur rounded-xl shadow-sm flex items-center justify-center"
          >
            <Share2 size={14} className="text-gray-400" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(outfit) }}
            className="w-8 h-8 bg-white/90 backdrop-blur rounded-xl shadow-sm flex items-center justify-center"
          >
            <Trash2 size={14} className="text-gray-400" />
          </button>
        </div>
        {/* View icon */}
        <div className="absolute bottom-2 start-2">
          <div className="w-7 h-7 bg-black/30 backdrop-blur rounded-lg flex items-center justify-center">
            <Eye size={13} className="text-white" />
          </div>
        </div>
        {outfit.is_public && (
          <div className="absolute top-2 start-2">
            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">
              ציבורי
            </span>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm truncate">{outfit.name}</p>
        {(outfit.occasion || outfit.season) && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {outfit.occasion && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {outfit.occasion}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => onScheduleToday(outfit)}
          className="w-full mt-2.5 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold"
        >
          <Calendar size={13} />
          לבש היום
        </button>
      </div>
    </div>
  )
}

function OutfitViewModal({
  outfit,
  onClose,
  onSchedule,
  onShare,
}: {
  outfit: Outfit
  onClose: () => void
  onSchedule: (o: Outfit) => void
  onShare: (o: Outfit) => void
}) {
  const [outfitItems, setOutfitItems] = useState<WardrobeItem[]>([])
  const [viewMode, setViewMode] = useState<'flatlay' | 'person'>('flatlay')
  const supabase = createClient()

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase
        .from('outfit_items')
        .select('wardrobe_items(*)')
        .eq('outfit_id', outfit.id)
      if (data) {
        const items = data.map((d: any) => d.wardrobe_items).filter(Boolean) as WardrobeItem[]
        setOutfitItems(items)
      }
    }
    loadItems()
  }, [outfit.id])

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col z-50">
      <div className="flex-1 flex flex-col bg-[#f9fafb] rounded-t-3xl mt-16 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
          >
            <X size={20} />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-gray-900">{outfit.name}</h2>
            {outfit.occasion && (
              <p className="text-xs text-gray-400">{outfit.occasion}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onShare(outfit)}
              className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
            >
              <Share2 size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100">
          <button
            onClick={() => setViewMode('flatlay')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              viewMode === 'flatlay' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            פריסה שטוחה
          </button>
          <button
            onClick={() => setViewMode('person')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              viewMode === 'person' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            על בן אדם
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {viewMode === 'flatlay' ? (
            <FlatLayView outfit={outfit} items={outfitItems} />
          ) : (
            <PersonView items={outfitItems} />
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-safe pt-3 bg-white border-t border-gray-100">
          <div className="flex gap-3">
            <Link href={`/outfits/new`} className="flex-1">
              <button className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">
                ערוך לוק
              </button>
            </Link>
            <button
              onClick={() => { onSchedule(outfit); onClose() }}
              className="flex-1 py-3.5 rounded-2xl bg-black text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Calendar size={16} />
              לבש היום
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FlatLayView({ outfit, items }: { outfit: Outfit; items: WardrobeItem[] }) {
  if (outfit.image_url) {
    return (
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100">
        <img
          src={outfit.image_url}
          alt={outfit.name}
          className="w-full object-contain max-h-96"
        />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <p className="text-sm">לא נמצאו פריטים בלוק זה</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <div className="aspect-square bg-gray-50 relative">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                {CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji ?? '👗'}
              </div>
            )}
          </div>
          <div className="p-2.5">
            <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PersonView({ items }: { items: WardrobeItem[] }) {
  const head = items.filter(i => i.category === 'accessories')
  const top = items.filter(i => ['tops', 'outerwear', 'dresses'].includes(i.category))
  const bottom = items.filter(i => i.category === 'bottoms')
  const shoes = items.filter(i => i.category === 'shoes')
  const bag = items.filter(i => i.category === 'bags')

  const Section = ({
    label,
    items: sectionItems,
  }: {
    label: string
    items: WardrobeItem[]
  }) => {
    if (sectionItems.length === 0) return null
    return (
      <div className="mb-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
        <div className="flex gap-2 flex-wrap">
          {sectionItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 w-20"
            >
              <div className="w-20 h-20 bg-gray-50">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {CLOTHING_CATEGORIES.find(c => c.value === item.category)?.emoji ?? '👗'}
                  </div>
                )}
              </div>
              <p className="text-[9px] font-medium text-gray-600 truncate px-1.5 py-1">
                {item.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100">
      {/* Simple body silhouette */}
      <div className="flex justify-center mb-4">
        <svg viewBox="0 0 120 280" className="w-24 opacity-10" fill="currentColor">
          <ellipse cx="60" cy="25" rx="20" ry="22" />
          <rect x="35" y="50" width="50" height="80" rx="8" />
          <rect x="20" y="52" width="18" height="65" rx="7" />
          <rect x="82" y="52" width="18" height="65" rx="7" />
          <rect x="35" y="128" width="22" height="100" rx="6" />
          <rect x="63" y="128" width="22" height="100" rx="6" />
        </svg>
      </div>

      {/* Outfit layers from top to bottom */}
      <Section label="אביזרים" items={head} />
      <Section label="עליון" items={top} />
      <Section label="תחתון" items={bottom} />
      <Section label="נעליים" items={shoes} />
      <Section label="תיקים" items={bag} />

      {items.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">לא נמצאו פריטים</p>
      )}
    </div>
  )
}

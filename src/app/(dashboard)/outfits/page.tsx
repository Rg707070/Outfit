'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { WeatherWidget } from '@/components/weather/weather-widget'
import { useToast } from '@/components/ui/toast'
import { Plus, Heart, Share2, Calendar, Trash2, AlertTriangle, Zap } from 'lucide-react'
import Link from 'next/link'

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
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
    setOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, is_favorite: !o.is_favorite } : o))
    toast(outfit.is_favorite ? 'הוסר מהמועדפים' : 'נוסף למועדפים ❤️')
  }

  async function shareOutfit(outfit: Outfit) {
    if (!outfit.is_public) {
      await supabase.from('outfits').update({ is_public: true }).eq('id', outfit.id)
      setOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, is_public: true } : o))
    }
    const url = `${window.location.origin}/share/${outfit.share_token}`
    await navigator.clipboard.writeText(url)
    toast('קישור השיתוף הועתק!')
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
    await supabase.from('calendar_outfits').upsert({
      user_id: user.id,
      outfit_id: outfit.id,
      date: today,
    }, { onConflict: 'user_id,date' })
    toast(`"${outfit.name}" שויך להיום! 📅`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הלוקים שלי</h1>
          <p className="text-gray-500 text-sm mt-1">{outfits.length} לוקים שמורים</p>
        </div>
        <Link href="/outfits/new"><Button><Plus size={16} />צור לוק</Button></Link>
      </div>

      <WeatherWidget />

      {/* Discover banner */}
      <Link href="/outfits/discover" className="group mt-6 flex items-center gap-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-2xl p-5 hover:from-black hover:to-gray-800 transition-all">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
          <Zap size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base">גלה קומבינציות לוקים</p>
          <p className="text-white/60 text-sm mt-0.5">החלק בין לוקים שנוצרו אוטומטית מהארון שלך</p>
        </div>
        <span className="text-white/40 text-xl group-hover:text-white/70 transition-colors">←</span>
      </Link>

      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl">✨</span>
            <p className="text-gray-500 mt-4 text-lg font-medium">אין לוקים עדיין</p>
            <p className="text-gray-400 text-sm mt-1">קודם הוסף בגדים לארון, ואז צור את הלוק הראשון שלך</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link href="/wardrobe"><Button variant="secondary"><Plus size={16} />הוסף לארון</Button></Link>
              <Link href="/outfits/new"><Button><Plus size={16} />צור לוק</Button></Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map(outfit => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onToggleFavorite={toggleFavorite}
                onShare={shareOutfit}
                onDelete={() => setDeletingId(outfit.id)}
                onScheduleToday={scheduleToday}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deletingId && (() => {
        const outfit = outfits.find(o => o.id === deletingId)
        if (!outfit) return null
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">מחיקת לוק?</h3>
                  <p className="text-sm text-gray-500">"{outfit.name}" יוסר לצמיתות.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setDeletingId(null)}>ביטול</Button>
                <Button variant="danger" className="flex-1" onClick={() => confirmDelete(outfit)}>מחק</Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function OutfitCard({
  outfit,
  onToggleFavorite,
  onShare,
  onDelete,
  onScheduleToday,
}: {
  outfit: Outfit
  onToggleFavorite: (o: Outfit) => void
  onShare: (o: Outfit) => void
  onDelete: (o: Outfit) => void
  onScheduleToday: (o: Outfit) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 relative flex items-center justify-center">
        {outfit.image_url ? (
          <img src={outfit.image_url} alt={outfit.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">👔</span>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {outfit.is_public && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">ציבורי</span>
          )}
        </div>
        {/* Action buttons — always visible */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          <button
            onClick={() => onToggleFavorite(outfit)}
            className="p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
            title={outfit.is_favorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
          >
            <Heart size={14} className={outfit.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          </button>
          <button
            onClick={() => onShare(outfit)}
            className="p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
            title="העתק קישור שיתוף"
          >
            <Share2 size={14} className="text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(outfit)}
            className="p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform hover:bg-red-50"
            title="מחק לוק"
          >
            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{outfit.name}</h3>
        {outfit.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{outfit.description}</p>}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {outfit.occasion && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{outfit.occasion}</span>
          )}
          {outfit.season && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">{outfit.season}</span>
          )}
        </div>
        <Button size="sm" variant="secondary" className="w-full mt-4" onClick={() => onScheduleToday(outfit)}>
          <Calendar size={14} />
          לביש היום
        </Button>
      </div>
    </div>
  )
}

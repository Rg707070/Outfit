'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { WeatherWidget } from '@/components/weather/weather-widget'
import { useToast } from '@/components/ui/toast'
import { Plus, Heart, Share2, Calendar, Trash2, AlertTriangle, Zap } from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{t.outfits.title}</h1>
          <p className="text-stone-500 text-sm mt-1">{t.outfits.saved(outfits.length)}</p>
        </div>
        <Link href="/outfits/new">
          <Button>
            <Plus size={16} />
            {t.outfits.create}
          </Button>
        </Link>
      </div>

      <WeatherWidget />

      {/* Discover banner */}
      <Link href="/outfits/discover" className="group mt-6 flex items-center gap-4 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-700 text-white rounded-2xl p-5 hover:from-stone-950 hover:via-stone-900 hover:to-stone-800 transition-all duration-300 shadow-lg shadow-stone-900/20">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
          <Zap size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base">{t.nav.discover}</p>
          <p className="text-white/60 text-sm mt-0.5">{t.outfits.discoverSub}</p>
        </div>
        <span className="text-white/40 text-xl group-hover:text-white/70 transition-colors">←</span>
      </Link>

      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-stone-100 rounded-2xl h-64 animate-shimmer" />
            ))}
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="text-4xl">✨</span>
            </div>
            <p className="text-stone-600 mt-4 text-lg font-semibold">{t.outfits.noOutfits}</p>
            <p className="text-stone-400 text-sm mt-1">{t.outfits.noOutfitsSub2}</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link href="/wardrobe"><Button variant="secondary"><Plus size={16} />{t.outfits.addToWardrobe}</Button></Link>
              <Link href="/outfits/new"><Button><Plus size={16} />{t.outfits.create}</Button></Link>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl shadow-stone-900/10 w-full max-w-sm p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">{t.outfits.deleteOutfit}</h3>
                  <p className="text-sm text-stone-500">{t.outfits.deleteConfirmSub(outfit.name)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setDeletingId(null)}>{t.wardrobe.cancel}</Button>
                <Button variant="danger" className="flex-1" onClick={() => confirmDelete(outfit)}>{t.outfits.deleteBtn}</Button>
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
  const { t } = useLang()
  return (
    <div className="group bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-[0_2px_16px_-4px_rgba(28,15,10,0.08)] hover:shadow-[0_8px_32px_-8px_rgba(28,15,10,0.14)] hover:shadow-rose-100/40 transition-all duration-300 hover:-translate-y-1">
      <div className="h-56 bg-gradient-to-br from-stone-50 to-rose-50/30 relative flex items-center justify-center overflow-hidden">
        {outfit.image_url ? (
          <img src={outfit.image_url} alt={outfit.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="text-5xl">👔</span>
        )}

        {/* Public badge */}
        {outfit.is_public && (
          <div className="absolute top-3 start-3">
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium shadow-sm">{t.outfits.public}</span>
          </div>
        )}

        {/* Favorite heart — always visible */}
        <button
          onClick={() => onToggleFavorite(outfit)}
          className="absolute top-3 end-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
          title={outfit.is_favorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
        >
          <Heart size={14} className={outfit.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-stone-400'} />
        </button>

        {/* Hover-reveal overlay with name, tags, and actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <h3 className="font-semibold text-white text-base leading-tight">{outfit.name}</h3>
          {(outfit.occasion || outfit.season) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {outfit.occasion && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">{outfit.occasion}</span>
              )}
              {outfit.season && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full capitalize font-medium backdrop-blur-sm">{outfit.season}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onScheduleToday(outfit)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-[0_4px_16px_-4px_rgba(244,63,94,0.5)] hover:from-rose-600 hover:to-pink-600 transition-all"
            >
              <Calendar size={12} />
              {t.outfits.wearToday}
            </button>
            <button
              onClick={() => onShare(outfit)}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors"
              title="העתק קישור שיתוף"
            >
              <Share2 size={14} className="text-white" />
            </button>
            <button
              onClick={() => onDelete(outfit)}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-red-500/70 transition-colors"
              title="מחק לוק"
            >
              <Trash2 size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Card body — visible when not hovering */}
      <div className="p-4 group-hover:opacity-0 transition-opacity duration-200">
        <h3 className="font-semibold text-stone-900">{outfit.name}</h3>
        {outfit.description && <p className="text-sm text-stone-500 mt-1 line-clamp-1">{outfit.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {outfit.occasion && (
            <span className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full font-medium">{outfit.occasion}</span>
          )}
          {outfit.season && (
            <span className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full capitalize font-medium">{outfit.season}</span>
          )}
        </div>
      </div>
    </div>
  )
}

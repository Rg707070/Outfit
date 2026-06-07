'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { WeatherWidget } from '@/components/weather/weather-widget'
import { Plus, Heart, Share2, Calendar, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
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
  }

  async function shareOutfit(outfit: Outfit) {
    if (!outfit.is_public) {
      await supabase.from('outfits').update({ is_public: true }).eq('id', outfit.id)
      setOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, is_public: true } : o))
    }
    const url = `${window.location.origin}/share/${outfit.share_token}`
    await navigator.clipboard.writeText(url)
    alert('קישור השיתוף הועתק! כל מי שיש לו קישור זה יכול לראות את הלוק שלך.')
  }

  async function deleteOutfit(outfit: Outfit) {
    if (!confirm(`למחוק את "${outfit.name}"? לא ניתן לבטל פעולה זו.`)) return
    await supabase.from('outfits').delete().eq('id', outfit.id)
    setOutfits(prev => prev.filter(o => o.id !== outfit.id))
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
    alert(`"${outfit.name}" תוכנן להיום!`)
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
            <p className="text-gray-400 text-sm mt-1">צור את הלוק הראשון שלך על ידי שילוב פריטים מהארון</p>
            <Link href="/outfits/new"><Button className="mt-6"><Plus size={16} />צור לוק ראשון</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map(outfit => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                onToggleFavorite={toggleFavorite}
                onShare={shareOutfit}
                onDelete={deleteOutfit}
                onScheduleToday={scheduleToday}
              />
            ))}
          </div>
        )}
      </div>
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
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 relative flex items-center justify-center">
        {outfit.image_url ? (
          <img src={outfit.image_url} alt={outfit.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">👔</span>
        )}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {outfit.is_favorite && <span className="text-red-500">❤️</span>}
          {outfit.is_public && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">ציבורי</span>
          )}
        </div>
        <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onToggleFavorite(outfit)} className="p-1.5 bg-white rounded-full shadow-sm" title="מועדף">
            <Heart size={14} className={outfit.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          </button>
          <button onClick={() => onShare(outfit)} className="p-1.5 bg-white rounded-full shadow-sm" title="העתק קישור שיתוף">
            <Share2 size={14} className="text-gray-400" />
          </button>
          <button onClick={() => onDelete(outfit)} className="p-1.5 bg-white rounded-full shadow-sm" title="מחק">
            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{outfit.name}</h3>
        {outfit.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{outfit.description}</p>}
        <div className="flex items-center gap-2 mt-3">
          {outfit.occasion && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{outfit.occasion}</span>
          )}
          {outfit.season && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">{outfit.season}</span>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => onScheduleToday(outfit)}>
            <Calendar size={14} />
            ללבוש היום
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onShare(outfit)}>
            <Share2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

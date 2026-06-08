'use client'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { WeatherWidget } from '@/components/weather/weather-widget'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useOutfits, useToggleOutfitFavorite, useDeleteOutfit } from '@/hooks/use-outfits'
import { useAuth } from '@/contexts/auth-context'
import { useState } from 'react'
import { Plus, Heart, Share2, Calendar, Trash2, Zap } from 'lucide-react'
import Link from 'next/link'
import { useLang } from '@/lib/lang-context'

export default function OutfitsPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useLang()
  const supabase = createClient()

  const { data: outfits = [], isLoading: loading, error } = useOutfits()
  const toggleFavoriteMutation = useToggleOutfitFavorite()
  const deleteMutation = useDeleteOutfit()

  async function toggleFavorite(outfit: Outfit) {
    try {
      await toggleFavoriteMutation.mutateAsync({
        id: outfit.id,
        isFavorite: outfit.is_favorite ?? false,
      })
      toast(outfit.is_favorite ? 'הוסר מהמועדפים' : 'נוסף למועדפים ❤️')
    } catch {
      toast('שגיאה בעדכון המועדף', 'error')
    }
  }

  async function shareOutfit(outfit: Outfit) {
    try {
      if (!outfit.is_public) {
        await supabase.from('outfits').update({ is_public: true }).eq('id', outfit.id)
      }
      const url = `${window.location.origin}/share/${outfit.share_token}`
      await navigator.clipboard.writeText(url)
      toast('קישור השיתוף הועתק!')
    } catch {
      toast('שגיאה בהעתקת הקישור', 'error')
    }
  }

  async function confirmDelete(outfit: Outfit) {
    try {
      await deleteMutation.mutateAsync(outfit.id)
      setDeletingId(null)
      toast('הלוק נמחק', 'info')
    } catch {
      toast('שגיאה במחיקת הלוק', 'error')
    }
  }

  async function scheduleToday(outfit: Outfit) {
    if (!user) return
    try {
      const today = new Date().toISOString().slice(0, 10)
      const { error } = await supabase
        .from('calendar_outfits')
        .upsert(
          { user_id: user.id, outfit_id: outfit.id, date: today },
          { onConflict: 'user_id,date' }
        )
      if (error) throw error
      toast(`"${outfit.name}" נקבע להיום! 📅`)
    } catch {
      toast('שגיאה בקביעת הלוק להיום', 'error')
    }
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">שגיאה בטעינת הלוקים. אנא נסה לרענן את הדף.</p>
      </div>
    )
  }

  const deletingOutfit = outfits.find((o) => o.id === deletingId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.outfits.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.outfits.saved(outfits.length)}</p>
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
      <Link
        href="/outfits/discover"
        className="group mt-6 flex items-center gap-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-2xl p-5 hover:from-black hover:to-gray-800 transition-all"
      >
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
              <div
                key={i}
                className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-64 animate-pulse"
              />
            ))}
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl">✨</span>
            <p className="text-gray-500 mt-4 text-lg font-medium">{t.outfits.noOutfits}</p>
            <p className="text-gray-400 text-sm mt-1">{t.outfits.noOutfitsSub2}</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link href="/wardrobe">
                <Button variant="secondary">
                  <Plus size={16} />
                  {t.outfits.addToWardrobe}
                </Button>
              </Link>
              <Link href="/outfits/new">
                <Button>
                  <Plus size={16} />
                  {t.outfits.create}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfits.map((outfit) => (
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

      <ConfirmDialog
        open={!!deletingOutfit}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
        title={t.outfits.deleteOutfit}
        description={deletingOutfit ? t.outfits.deleteConfirmSub(deletingOutfit.name) : undefined}
        confirmLabel={t.outfits.deleteBtn}
        cancelLabel={t.wardrobe.cancel}
        onConfirm={() => deletingOutfit && confirmDelete(deletingOutfit)}
        loading={deleteMutation.isPending}
      />
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 relative flex items-center justify-center">
        {outfit.image_url ? (
          <Image
            src={outfit.image_url}
            alt={outfit.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <span className="text-5xl">👔</span>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5 z-10">
          {outfit.is_public && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {t.outfits.public}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
          <button
            onClick={() => onToggleFavorite(outfit)}
            className="p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
            aria-label={outfit.is_favorite ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
          >
            <Heart
              size={14}
              className={outfit.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            />
          </button>
          <button
            onClick={() => onShare(outfit)}
            className="p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
            aria-label="העתק קישור שיתוף"
          >
            <Share2 size={14} className="text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(outfit)}
            className="p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform hover:bg-red-50"
            aria-label="מחק לוק"
          >
            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{outfit.name}</h3>
        {outfit.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{outfit.description}</p>
        )}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {outfit.occasion && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
              {outfit.occasion}
            </span>
          )}
          {outfit.season && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full capitalize">
              {outfit.season}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="w-full mt-4"
          onClick={() => onScheduleToday(outfit)}
        >
          <Calendar size={14} />
          {t.outfits.wearToday}
        </Button>
      </div>
    </div>
  )
}

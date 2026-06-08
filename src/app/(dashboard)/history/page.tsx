'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/dialog'
import {
  useHistory,
  useDeleteHistoryEntry,
  useOutfitsForHistory,
  HISTORY_PAGE_SIZE,
} from '@/hooks/use-history'
import { useAuth } from '@/contexts/auth-context'
import { Plus, Tag, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { useLang } from '@/lib/lang-context'

export default function HistoryPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [limit, setLimit] = useState(HISTORY_PAGE_SIZE)
  const { toast } = useToast()
  const { t } = useLang()

  const { data, isLoading: loading, error } = useHistory(limit)
  const history = data?.entries ?? []
  const total = data?.total ?? 0
  const { data: outfits = [] } = useOutfitsForHistory()
  const deleteMutation = useDeleteHistoryEntry()

  async function confirmDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      setDeletingId(null)
      toast('הרשומה נמחקה', 'info')
    } catch {
      toast('שגיאה במחיקת הרשומה', 'error')
    }
  }

  const categories = [
    'all',
    ...Array.from(new Set(history.map((h) => h.category_label).filter(Boolean) as string[])),
  ]
  const filtered =
    activeCategory === 'all' ? history : history.filter((h) => h.category_label === activeCategory)
  const hasMore = history.length < total
  const deletingEntry = deletingId ? history.find((h) => h.id === deletingId) : null

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">שגיאה בטעינת ההיסטוריה. אנא נסה לרענן את הדף.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.history.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.history.entries(total)}</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          {t.history.log}
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
              activeCategory === cat
                ? 'bg-black text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {cat !== 'all' && <Tag size={12} />}
            {cat === 'all' ? t.history.all : cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">📅</span>
            <p className="text-gray-500 mt-3 font-medium">{t.history.noHistory}</p>
            <p className="text-gray-400 text-sm mt-1">
              רשום כאן לוקים שלבשת כדי לעקוב אחרי הסגנון שלך
            </p>
            <Button className="mt-4" onClick={() => setShowAdd(true)}>
              <Plus size={16} />
              {t.history.logFirst}
            </Button>
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                {entry.outfits?.image_url ? (
                  <Image
                    src={entry.outfits.image_url}
                    alt={entry.outfits.name ?? t.history.customOutfit}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <span className="text-xl">👔</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {entry.outfits?.name ?? t.history.customOutfit}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-400">
                    {format(new Date(entry.worn_date), 'EEEE, d בMMMM yyyy', { locale: he })}
                  </span>
                  {entry.category_label && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag size={10} /> {entry.category_label}
                    </span>
                  )}
                </div>
                {entry.notes && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{entry.notes}</p>
                )}
              </div>
              <button
                onClick={() => setDeletingId(entry.id)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                aria-label="מחק רשומה"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {hasMore && activeCategory === 'all' && (
        <div className="flex justify-center mt-6">
          <Button variant="secondary" onClick={() => setLimit((l) => l + HISTORY_PAGE_SIZE)}>
            טען עוד ({total - history.length} נוספים)
          </Button>
        </div>
      )}

      {showAdd && (
        <LogOutfitModal
          outfits={outfits}
          onClose={() => setShowAdd(false)}
          onAdded={() => toast(`${t.history.log} 📅`)}
        />
      )}

      <ConfirmDialog
        open={!!deletingEntry}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
        title="מחיקת רשומה?"
        description={
          deletingEntry
            ? `"${deletingEntry.outfits?.name ?? t.history.customOutfit}" יוסר מההיסטוריה.`
            : undefined
        }
        confirmLabel={t.history.logBtn}
        cancelLabel={t.history.cancel}
        onConfirm={() => deletingEntry && confirmDelete(deletingEntry.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function LogOutfitModal({
  outfits,
  onClose,
  onAdded,
}: {
  outfits: Outfit[]
  onClose: () => void
  onAdded: () => void
}) {
  const { t } = useLang()
  const [outfitId, setOutfitId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [categoryLabel, setCategoryLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase.from('outfit_history').insert({
        user_id: user.id,
        outfit_id: outfitId || null,
        worn_date: date,
        notes: notes || null,
        category_label: categoryLabel || null,
      })
      if (error) throw error
      onAdded()
      onClose()
    } catch {
      toast('שגיאה ברישום הלוק', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold dark:text-white">{t.history.modalTitle}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.history.outfitOptional}
            </label>
            <select
              value={outfitId}
              onChange={(e) => setOutfitId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:text-white"
            >
              <option value="">{t.history.selectOutfit}</option>
              {outfits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.history.dateLabel}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.history.categoryLabel}
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {['עבודה', 'קז׳ואל', 'ערב', 'ספורט', 'דייט'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCategoryLabel(categoryLabel === tag ? '' : tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoryLabel === tag
                      ? 'bg-black text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              placeholder={t.history.categoryPlaceholder}
              maxLength={60}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.history.notesLabel}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t.history.notesPlaceholder}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:text-white resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t.history.cancel}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t.history.saving : t.history.logBtn}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

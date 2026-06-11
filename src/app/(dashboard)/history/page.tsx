'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OutfitHistory, Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Plus, Tag, Trash2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { he, enUS } from 'date-fns/locale'
import { useLang } from '@/lib/lang-context'

type HistoryWithOutfit = OutfitHistory & { outfits: { name: string; image_url: string | null } | null }

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryWithOutfit[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
  const { t, lang } = useLang()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: hist }, { data: outf }] = await Promise.all([
      supabase.from('outfit_history').select('*, outfits(name, image_url)').eq('user_id', user.id).order('worn_date', { ascending: false }),
      supabase.from('outfits').select('*').eq('user_id', user.id),
    ])
    setHistory((hist as HistoryWithOutfit[]) ?? [])
    setOutfits(outf ?? [])
    setLoading(false)
  }

  async function confirmDelete(id: string) {
    await supabase.from('outfit_history').delete().eq('id', id)
    setHistory(prev => prev.filter(h => h.id !== id))
    setDeletingId(null)
    toast(t.history.deletedToast, 'info')
  }

  const categories = ['all', ...Array.from(new Set(history.map(h => h.category_label).filter(Boolean) as string[]))]
  const filtered = activeCategory === 'all' ? history : history.filter(h => h.category_label === activeCategory)
  const deletingEntry = deletingId ? history.find(h => h.id === deletingId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.history.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.history.entries(history.length)}</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} />{t.history.log}</Button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
              activeCategory === cat ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat !== 'all' && <Tag size={12} />}
            {cat === 'all' ? t.history.all : cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">📅</span>
            <p className="text-gray-500 mt-3 font-medium">{t.history.noHistory}</p>
            <p className="text-gray-400 text-sm mt-1">{t.history.noHistorySub}</p>
            <Button className="mt-4" onClick={() => setShowAdd(true)}><Plus size={16} />{t.history.logFirst}</Button>
          </div>
        ) : filtered.map(entry => (
          <div key={entry.id} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              {entry.outfits?.image_url ? (
                <img src={entry.outfits.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : <span className="text-xl">👔</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{entry.outfits?.name ?? t.history.customOutfit}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400">
                  {format(new Date(entry.worn_date), t.history.datePattern, { locale: lang === 'he' ? he : enUS })}
                </span>
                {entry.category_label && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Tag size={10} /> {entry.category_label}
                  </span>
                )}
              </div>
              {entry.notes && <p className="text-xs text-gray-400 mt-1 truncate">{entry.notes}</p>}
            </div>
            <button
              onClick={() => setDeletingId(entry.id)}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title={t.history.deleteEntryTitle}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {showAdd && (
        <LogOutfitModal
          outfits={outfits}
          onClose={() => setShowAdd(false)}
          onAdded={() => { loadData(); toast(t.history.loggedToast) }}
        />
      )}

      {deletingEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{t.history.deleteTitle}</h3>
                <p className="text-sm text-gray-500">"{deletingEntry.outfits?.name ?? t.history.customOutfit}"</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeletingId(null)}>{t.history.cancel}</Button>
              <Button variant="danger" className="flex-1" onClick={() => confirmDelete(deletingEntry.id)}>{t.history.delete}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LogOutfitModal({ outfits, onClose, onAdded }: { outfits: Outfit[]; onClose: () => void; onAdded: () => void }) {
  const { t } = useLang()
  const [outfitId, setOutfitId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [categoryLabel, setCategoryLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('outfit_history').insert({
      user_id: user.id,
      outfit_id: outfitId || null,
      worn_date: date,
      notes: notes || null,
      category_label: categoryLabel || null,
    })
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{t.history.modalTitle}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.history.outfitOptional}</label>
            <select
              value={outfitId}
              onChange={e => setOutfitId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">{t.history.selectOutfit}</option>
              {outfits.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.history.dateLabel}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.history.categoryLabel}</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {t.history.quickTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCategoryLabel(categoryLabel === tag ? '' : tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoryLabel === tag ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={categoryLabel}
              onChange={e => setCategoryLabel(e.target.value)}
              placeholder={t.history.categoryPlaceholder}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.history.notesLabel}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder={t.history.notesPlaceholder}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t.history.cancel}</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? t.history.saving : t.history.logBtn}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

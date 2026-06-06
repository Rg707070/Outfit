'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OutfitHistory, Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Plus, Tag, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

type HistoryWithOutfit = OutfitHistory & { outfits: { name: string; image_url: string | null } | null }

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryWithOutfit[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
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

  async function deleteEntry(id: string) {
    await supabase.from('outfit_history').delete().eq('id', id)
    setHistory(prev => prev.filter(h => h.id !== id))
  }

  const categories = ['all', ...Array.from(new Set(history.map(h => h.category_label).filter(Boolean) as string[]))]
  const filtered = activeCategory === 'all' ? history : history.filter(h => h.category_label === activeCategory)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outfit History</h1>
          <p className="text-gray-500 text-sm mt-1">{history.length} entries recorded</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} />Log outfit</Button>
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
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">📅</span>
            <p className="text-gray-500 mt-3 font-medium">No history yet</p>
            <Button className="mt-4" onClick={() => setShowAdd(true)}><Plus size={16} />Log first outfit</Button>
          </div>
        ) : filtered.map(entry => (
          <div key={entry.id} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 group">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              {entry.outfits?.image_url ? (
                <img src={entry.outfits.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : <span className="text-xl">👔</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{entry.outfits?.name ?? 'Custom outfit'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{format(new Date(entry.worn_date), 'EEEE, MMMM d, yyyy')}</span>
                {entry.category_label && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Tag size={10} /> {entry.category_label}
                  </span>
                )}
              </div>
              {entry.notes && <p className="text-xs text-gray-400 mt-1 truncate">{entry.notes}</p>}
            </div>
            <button onClick={() => deleteEntry(entry.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {showAdd && <LogOutfitModal outfits={outfits} onClose={() => setShowAdd(false)} onAdded={loadData} />}
    </div>
  )
}

function LogOutfitModal({ outfits, onClose, onAdded }: { outfits: Outfit[]; onClose: () => void; onAdded: () => void }) {
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
          <h2 className="text-lg font-semibold">Log outfit worn</h2>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Outfit (optional)</label>
            <select
              value={outfitId}
              onChange={e => setOutfitId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Select outfit…</option>
              {outfits.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category label</label>
            <input
              type="text"
              value={categoryLabel}
              onChange={e => setCategoryLabel(e.target.value)}
              placeholder="e.g. Work, Casual, Date night…"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="How did it feel? Any notes…"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Saving…' : 'Log outfit'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

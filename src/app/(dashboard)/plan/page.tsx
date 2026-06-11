'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarOutfit, Outfit, OutfitHistory } from '@/types/database'
import { useToast } from '@/components/ui/toast'
import {
  ChevronLeft, ChevronRight, Plus, X, Tag, Trash2, Check,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday,
} from 'date-fns'
import { he } from 'date-fns/locale'

type Tab = 'calendar' | 'history'
type HistoryWithOutfit = OutfitHistory & {
  outfits: { name: string; image_url: string | null } | null
}

export default function PlanPage() {
  const [tab, setTab] = useState<Tab>('calendar')

  return (
    <div className="min-h-screen pb-nav">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">תכנון</h1>
        <p className="text-gray-400 text-xs mt-0.5">לוח שנה והיסטוריה</p>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTab('calendar')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'calendar' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            📅 לוח שנה
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'history' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            🕐 היסטוריה
          </button>
        </div>
      </div>

      {tab === 'calendar' ? <CalendarTab /> : <HistoryTab />}
    </div>
  )
}

/* ─── Calendar Tab ─────────────────────────────────────────── */

function CalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarItems, setCalendarItems] = useState<CalendarOutfit[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })
  const startDayOfWeek = startOfMonth(currentMonth).getDay()

  useEffect(() => { loadData() }, [currentMonth])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const [{ data: cal }, { data: outf }] = await Promise.all([
      supabase
        .from('calendar_outfits')
        .select('*, outfits(name, image_url)')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end),
      supabase.from('outfits').select('*').eq('user_id', user.id),
    ])
    setCalendarItems(cal ?? [])
    setOutfits(outf ?? [])
  }

  function getOutfitForDay(date: Date) {
    return calendarItems.find(c => c.date === format(date, 'yyyy-MM-dd'))
  }

  async function removeFromDay(date: Date, e: React.MouseEvent) {
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const dateStr = format(date, 'yyyy-MM-dd')
    await supabase.from('calendar_outfits').delete().eq('user_id', user.id).eq('date', dateStr)
    setCalendarItems(prev => prev.filter(c => c.date !== dateStr))
    toast('הלוק הוסר מהיום', 'info')
  }

  const DAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

  return (
    <div className="px-4 mt-3">
      {/* Month navigation */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight size={18} />
          </button>
          <h2 className="text-base font-bold text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 border-b border-e border-gray-50" />
          ))}
          {days.map((day, i) => {
            const outfitForDay = getOutfitForDay(day)
            const isLast = (startDayOfWeek + i + 1) % 7 === 0
            return (
              <div
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setShowAssign(true) }}
                className={`h-16 border-b border-e border-gray-50 p-1 cursor-pointer hover:bg-gray-50 transition-colors relative group ${
                  isLast ? 'border-e-0' : ''
                }`}
              >
                <span
                  className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday(day)
                      ? 'bg-black text-white'
                      : 'text-gray-600'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {outfitForDay ? (
                  <div className="mt-0.5 relative">
                    {/* @ts-ignore */}
                    {outfitForDay.outfits?.image_url ? (
                      <img
                        // @ts-ignore
                        src={outfitForDay.outfits.image_url}
                        alt=""
                        className="w-full h-7 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="bg-black text-white text-[9px] rounded-lg px-1 py-0.5 truncate">
                        {/* @ts-ignore */}
                        {outfitForDay.outfits?.name ?? 'לוק'}
                      </div>
                    )}
                    <button
                      onClick={e => removeFromDay(day, e)}
                      className="absolute -top-1 -end-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center mt-1">
                    <Plus size={10} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming scheduled */}
      {calendarItems.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold text-gray-900 mb-3">לוקים מתוכננים</p>
          <div className="space-y-2">
            {calendarItems
              .filter(c => new Date(c.date) >= new Date())
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                    {/* @ts-ignore */}
                    {item.outfits?.image_url ? (
                      // @ts-ignore
                      <img src={item.outfits.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">👔</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* @ts-ignore */}
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {/* @ts-ignore */}
                      {item.outfits?.name ?? 'לוק'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(item.date), 'EEEE, d בMMMM', { locale: he })}
                    </p>
                  </div>
                  {isToday(new Date(item.date)) && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">
                      היום
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {showAssign && selectedDate && (
        <AssignModal
          date={selectedDate}
          outfits={outfits}
          currentOutfit={getOutfitForDay(selectedDate)}
          onClose={() => setShowAssign(false)}
          onAssigned={() => {
            loadData()
            toast(`לוק תוכנן ל-${format(selectedDate, 'd/M')} 📅`)
          }}
        />
      )}
    </div>
  )
}

function AssignModal({
  date, outfits, currentOutfit, onClose, onAssigned,
}: {
  date: Date
  outfits: Outfit[]
  currentOutfit: CalendarOutfit | undefined
  onClose: () => void
  onAssigned: () => void
}) {
  // @ts-ignore
  const currentId = currentOutfit?.outfit_id ?? ''
  const [selected, setSelected] = useState<string>(currentId)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleAssign() {
    if (!selected) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('calendar_outfits').upsert(
      { user_id: user.id, outfit_id: selected, date: format(date, 'yyyy-MM-dd') },
      { onConflict: 'user_id,date' }
    )
    onAssigned()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">
            {format(date, 'd בMMMM', { locale: he })}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-3 space-y-2 max-h-72 overflow-y-auto">
          {outfits.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl">👔</span>
              <p className="text-sm text-gray-400 mt-2">אין לוקים עדיין</p>
            </div>
          ) : (
            outfits.map(outfit => (
              <button
                key={outfit.id}
                onClick={() => setSelected(outfit.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-right ${
                  selected === outfit.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {outfit.image_url ? (
                    <img src={outfit.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>👔</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-semibold text-gray-900 truncate">{outfit.name}</p>
                  {outfit.occasion && (
                    <p className="text-xs text-gray-400">{outfit.occasion}</p>
                  )}
                </div>
                {selected === outfit.id && (
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-white" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
        <div className="flex gap-3 px-4 pb-5 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm"
          >
            ביטול
          </button>
          <button
            onClick={handleAssign}
            disabled={!selected || loading}
            className="flex-1 py-3 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40"
          >
            {loading ? 'שומר…' : 'שייך לוק'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── History Tab ──────────────────────────────────────────── */

function HistoryTab() {
  const [history, setHistory] = useState<HistoryWithOutfit[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: hist }, { data: outf }] = await Promise.all([
      supabase
        .from('outfit_history')
        .select('*, outfits(name, image_url)')
        .eq('user_id', user.id)
        .order('worn_date', { ascending: false }),
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
    toast('רשומה נמחקה', 'info')
  }

  const categories = [
    'all',
    ...Array.from(
      new Set(history.map(h => h.category_label).filter(Boolean) as string[])
    ),
  ]
  const filtered =
    activeCategory === 'all'
      ? history
      : history.filter(h => h.category_label === activeCategory)
  const deletingEntry = deletingId ? history.find(h => h.id === deletingId) : null

  return (
    <div className="px-4 mt-3">
      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-3">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-black text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {cat !== 'all' && <Tag size={10} />}
            {cat === 'all' ? `הכל (${history.length})` : cat}
          </button>
        ))}
        <button
          onClick={() => setShowAdd(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-black text-white"
        >
          <Plus size={12} />
          רשום
        </button>
      </div>

      {/* History list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4 text-4xl">
            📅
          </div>
          <h3 className="text-lg font-bold text-gray-900">אין היסטוריה עדיין</h3>
          <p className="text-gray-400 text-sm mt-1">רשום את הלוקים שאתה לובש</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-6 bg-black text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2"
          >
            <Plus size={18} />
            רשום לוק ראשון
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <div
              key={entry.id}
              className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {entry.outfits?.image_url ? (
                  <img
                    src={entry.outfits.image_url}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-xl">👔</span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {entry.outfits?.name ?? 'לוק מותאם'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap justify-end">
                  <span className="text-xs text-gray-400">
                    {format(new Date(entry.worn_date), 'EEEE, d בMMMM', { locale: he })}
                  </span>
                  {entry.category_label && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag size={9} />
                      {entry.category_label}
                    </span>
                  )}
                </div>
                {entry.notes && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.notes}</p>
                )}
              </div>
              <button
                onClick={() => setDeletingId(entry.id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Log modal */}
      {showAdd && (
        <LogModal
          outfits={outfits}
          onClose={() => setShowAdd(false)}
          onAdded={() => { loadData(); toast('לוק נרשם! 📅') }}
        />
      )}

      {/* Delete confirm */}
      {deletingEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 mb-2">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">מחק רשומה?</h3>
              <p className="text-sm text-gray-500 mt-1">
                הרשומה תוסר לצמיתות
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
                onClick={() => confirmDelete(deletingEntry.id)}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LogModal({
  outfits, onClose, onAdded,
}: {
  outfits: Outfit[]
  onClose: () => void
  onAdded: () => void
}) {
  const [outfitId, setOutfitId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [categoryLabel, setCategoryLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const QUICK_TAGS = ['עבודה', 'קז׳ואל', 'ערב', 'ספורט', 'דייט']

  async function handleSubmit() {
    if (!date || loading) return
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f9fafb]">
      <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
        >
          <X size={20} />
        </button>
        <h2 className="font-bold text-gray-900">רשום לוק שנלבש</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Outfit selector */}
        <div className="bg-white rounded-2xl px-4 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">לוק (אופציונלי)</p>
          <select
            value={outfitId}
            onChange={e => setOutfitId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
            dir="rtl"
          >
            <option value="">בחר לוק…</option>
            {outfits.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="bg-white rounded-2xl px-4 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">תאריך *</p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>

        {/* Category */}
        <div className="bg-white rounded-2xl px-4 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">קטגוריה</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {QUICK_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setCategoryLabel(categoryLabel === tag ? '' : tag)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  categoryLabel === tag
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600'
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
            placeholder="או הקלד קטגוריה מותאמת…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
            dir="rtl"
          />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl px-4 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">הערות</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="איך זה הרגיש? הערות…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none text-right"
            dir="rtl"
          />
        </div>
      </div>

      <div className="px-4 py-4 bg-white border-t border-gray-100 pb-safe">
        <button
          onClick={handleSubmit}
          disabled={loading || !date}
          className="w-full bg-black text-white py-4 rounded-2xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              שומר…
            </>
          ) : (
            <>
              <Check size={20} />
              רשום לוק
            </>
          )}
        </button>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarOutfit, Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { WeatherWidget } from '@/components/weather/weather-widget'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns'

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarItems, setCalendarItems] = useState<CalendarOutfit[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAssign, setShowAssign] = useState(false)
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
      supabase.from('calendar_outfits').select('*, outfits(name, image_url)').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('outfits').select('*').eq('user_id', user.id),
    ])
    setCalendarItems(cal ?? [])
    setOutfits(outf ?? [])
  }

  function getOutfitForDay(date: Date) {
    return calendarItems.find(c => c.date === format(date, 'yyyy-MM-dd'))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">לוח שנה של לוקים</h1>
        <WeatherWidget />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-xl">
            <ChevronRight size={20} />
          </button>
          <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-50 rounded-xl">
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-3">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 border-b border-r border-gray-50" />
          ))}
          {days.map((day, i) => {
            const outfitForDay = getOutfitForDay(day)
            const isLast = (startDayOfWeek + i + 1) % 7 === 0
            return (
              <div
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setShowAssign(true) }}
                className={`h-24 border-b border-r border-gray-50 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                  isLast ? 'border-r-0' : ''
                }`}
              >
                <span className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                  isToday(day) ? 'bg-black text-white' : 'text-gray-700'
                }`}>
                  {format(day, 'd')}
                </span>
                {outfitForDay ? (
                  <div className="mt-1">
                    {/* @ts-ignore */}
                    {outfitForDay.outfits?.image_url ? (
                      // @ts-ignore
                      <img src={outfitForDay.outfits.image_url} alt="" className="w-full h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="bg-black text-white text-xs rounded-lg px-2 py-1 truncate">
                        {/* @ts-ignore */}
                        {outfitForDay.outfits?.name ?? 'לוק'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-center opacity-0 hover:opacity-100">
                    <Plus size={14} className="text-gray-300" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showAssign && selectedDate && (
        <AssignOutfitModal
          date={selectedDate}
          outfits={outfits}
          onClose={() => setShowAssign(false)}
          onAssigned={loadData}
        />
      )}
    </div>
  )
}

function AssignOutfitModal({
  date, outfits, onClose, onAssigned
}: {
  date: Date
  outfits: Outfit[]
  onClose: () => void
  onAssigned: () => void
}) {
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleAssign() {
    if (!selected) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('calendar_outfits').upsert({
      user_id: user.id,
      outfit_id: selected,
      date: format(date, 'yyyy-MM-dd'),
    }, { onConflict: 'user_id,date' })
    onAssigned()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">שייך לוק — {format(date, 'd/M')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
          {outfits.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">אין לוקים עדיין. צור אחד תחילה!</p>
          ) : outfits.map(outfit => (
            <button
              key={outfit.id}
              onClick={() => setSelected(outfit.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                selected === outfit.id ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                {outfit.image_url ? (
                  <img src={outfit.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : <span>👔</span>}
              </div>
              <span className="text-sm font-medium text-gray-900">{outfit.name}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} className="flex-1">ביטול</Button>
          <Button onClick={handleAssign} disabled={!selected || loading} className="flex-1">
            {loading ? 'שומר…' : 'שייך'}
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Outfit } from '@/types/database'
import { Button } from '@/components/ui/button'
import { WeatherWidget } from '@/components/weather/weather-widget'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/auth-context'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import { useLang } from '@/lib/lang-context'

type CalendarOutfitWithRelation = {
  id: string
  user_id: string
  outfit_id: string
  date: string
  notes: string | null
  created_at: string | null
  outfits: { name: string; image_url: string | null } | null
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarItems, setCalendarItems] = useState<CalendarOutfitWithRelation[]>([])
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useLang()
  const supabase = createClient()

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })
  const startDayOfWeek = startOfMonth(currentMonth).getDay()

  async function loadData() {
    if (!user) return
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
      const [{ data: cal, error: calError }, { data: outf, error: outfError }] = await Promise.all([
        supabase
          .from('calendar_outfits')
          .select('*, outfits(name, image_url)')
          .eq('user_id', user.id)
          .gte('date', start)
          .lte('date', end),
        supabase.from('outfits').select('*').eq('user_id', user.id),
      ])
      if (calError) throw calError
      if (outfError) throw outfError
      setCalendarItems((cal as CalendarOutfitWithRelation[]) ?? [])
      setOutfits(outf ?? [])
    } catch {
      toast('שגיאה בטעינת לוח השנה', 'error')
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, user])

  function getOutfitForDay(date: Date) {
    return calendarItems.find((c) => c.date === format(date, 'yyyy-MM-dd'))
  }

  async function removeFromDay(date: Date, e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const { error } = await supabase
        .from('calendar_outfits')
        .delete()
        .eq('user_id', user.id)
        .eq('date', dateStr)
      if (error) throw error
      setCalendarItems((prev) => prev.filter((c) => c.date !== dateStr))
      toast('הלוק הוסר מהיום', 'info')
    } catch {
      toast('שגיאה בהסרת הלוק', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.calendar.title}</h1>
        <WeatherWidget />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="חודש קודם"
          >
            <ChevronRight size={20} />
          </button>
          <h2 className="text-lg font-semibold dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="חודש הבא"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {t.calendar.days.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-3">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-24 border-b border-r border-gray-50 dark:border-gray-800"
            />
          ))}
          {days.map((day, i) => {
            const outfitForDay = getOutfitForDay(day)
            const isLast = (startDayOfWeek + i + 1) % 7 === 0
            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  setSelectedDate(day)
                  setShowAssign(true)
                }}
                className={`h-24 border-b border-r border-gray-50 dark:border-gray-800 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative group ${
                  isLast ? 'border-r-0' : ''
                }`}
              >
                <span
                  className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isToday(day)
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {outfitForDay ? (
                  <div className="mt-1 relative">
                    {outfitForDay.outfits?.image_url ? (
                      <div className="relative w-full h-12 rounded-lg overflow-hidden">
                        <Image
                          src={outfitForDay.outfits.image_url}
                          alt={outfitForDay.outfits.name ?? t.calendar.outfit}
                          fill
                          className="object-cover"
                          sizes="100px"
                        />
                      </div>
                    ) : (
                      <div className="bg-black text-white text-xs rounded-lg px-2 py-1 truncate dark:bg-white dark:text-black">
                        {outfitForDay.outfits?.name ?? t.calendar.outfit}
                      </div>
                    )}
                    <button
                      onClick={(e) => removeFromDay(day, e)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      aria-label="הסר לוק מיום זה"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-center">
                    <Plus
                      size={14}
                      className="text-gray-200 dark:text-gray-700 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-bold">
            1
          </div>
          <span>היום</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plus size={12} />
          <span>{t.calendar.assign}</span>
        </div>
      </div>

      {showAssign && selectedDate && (
        <AssignOutfitModal
          date={selectedDate}
          outfits={outfits}
          currentOutfit={getOutfitForDay(selectedDate)}
          onClose={() => setShowAssign(false)}
          onAssigned={() => {
            loadData()
            toast(`${t.calendar.outfit} ${format(selectedDate, 'd/M')} 📅`)
          }}
        />
      )}
    </div>
  )
}

function AssignOutfitModal({
  date,
  outfits,
  currentOutfit,
  onClose,
  onAssigned,
}: {
  date: Date
  outfits: Outfit[]
  currentOutfit: CalendarOutfitWithRelation | undefined
  onClose: () => void
  onAssigned: () => void
}) {
  const currentId = currentOutfit?.outfit_id ?? ''
  const [selected, setSelected] = useState<string>(currentId)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useLang()
  const supabase = createClient()

  async function handleAssign() {
    if (!selected || !user) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('calendar_outfits')
        .upsert(
          { user_id: user.id, outfit_id: selected, date: format(date, 'yyyy-MM-dd') },
          { onConflict: 'user_id,date' }
        )
      if (error) throw error
      onAssigned()
      onClose()
    } catch {
      toast('שגיאה בשיוך הלוק', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold dark:text-white">
            {t.calendar.assignTitle(format(date, 'd/M/yyyy'))}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
          {outfits.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl">👔</span>
              <p className="text-sm text-gray-400 mt-2">{t.calendar.noOutfits}</p>
            </div>
          ) : (
            outfits.map((outfit) => (
              <button
                key={outfit.id}
                onClick={() => setSelected(outfit.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-right ${
                  selected === outfit.id
                    ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800'
                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                  {outfit.image_url ? (
                    <Image
                      src={outfit.image_url}
                      alt={outfit.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <span>👔</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {outfit.name}
                  </p>
                  {outfit.occasion && <p className="text-xs text-gray-400">{outfit.occasion}</p>}
                </div>
                {selected === outfit.id && (
                  <div className="w-5 h-5 rounded-full bg-black dark:bg-white flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2.5 2.5L8 3"
                        stroke={
                          typeof document !== 'undefined' &&
                          document.documentElement.classList.contains('dark')
                            ? 'black'
                            : 'white'
                        }
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
        <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t.calendar.cancel}
          </Button>
          <Button onClick={handleAssign} disabled={!selected || loading} className="flex-1">
            {loading ? t.calendar.saving : t.calendar.assign}
          </Button>
        </div>
      </div>
    </div>
  )
}

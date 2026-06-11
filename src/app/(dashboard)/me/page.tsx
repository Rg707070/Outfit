'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import {
  Heart, ShoppingBag, Star, BarChart3, ChevronLeft,
  LogOut, Lock, Globe, X, Check, Shirt, LayoutGrid,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'

interface Stats {
  items: number
  outfits: number
  history: number
  favorites: number
}

export default function MePage() {
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [stats, setStats] = useState<Stats>({ items: 0, outfits: 0, history: 0, favorites: 0 })
  const [loading, setLoading] = useState(true)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const { toast } = useToast()
  const { lang, setLang } = useLang()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserName(user.user_metadata?.full_name ?? '')
    setUserEmail(user.email ?? '')

    const [
      { count: items },
      { count: outfits },
      { count: history },
      { count: favorites },
    ] = await Promise.all([
      supabase.from('wardrobe_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('outfits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('outfit_history').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('wardrobe_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_favorite', true),
    ])

    setStats({
      items: items ?? 0,
      outfits: outfits ?? 0,
      history: history ?? 0,
      favorites: favorites ?? 0,
    })
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen pb-nav">
      {/* Profile header */}
      <div className="bg-white px-5 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {loading ? '…' : userName || 'המשתמש שלי'}
            </h1>
            <p className="text-gray-400 text-sm truncate mt-0.5">{userEmail}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.items}</p>
            <p className="text-xs text-gray-500 mt-0.5">פריטים</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.outfits}</p>
            <p className="text-xs text-gray-500 mt-0.5">לוקים</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.history}</p>
            <p className="text-xs text-gray-500 mt-0.5">לביוש</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Quick navigation grid */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">
            הארון שלי
          </p>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink
              href="/wardrobe"
              icon="👗"
              label="ארון בגדים"
              sublabel={`${stats.items} פריטים`}
              color="bg-blue-50"
            />
            <QuickLink
              href="/outfits"
              icon="✨"
              label="הלוקים שלי"
              sublabel={`${stats.outfits} לוקים`}
              color="bg-purple-50"
            />
            <QuickLink
              href="/favorites"
              icon="❤️"
              label="מועדפים"
              sublabel={`${stats.favorites} פריטים`}
              color="bg-red-50"
            />
            <QuickLink
              href="/insights"
              icon="📊"
              label="תובנות"
              sublabel="סטטיסטיקות"
              color="bg-green-50"
            />
          </div>
        </div>

        {/* Shopping section */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">
            קניות
          </p>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink
              href="/wishlist"
              icon="🛍"
              label="רשימת קניות"
              sublabel="מה לקנות"
              color="bg-orange-50"
            />
            <QuickLink
              href="/wishlist?tab=wishlist"
              icon="⭐"
              label="ווישליסט"
              sublabel="חפצי חמדה"
              color="bg-yellow-50"
            />
          </div>
        </div>

        {/* Settings section */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-4 pt-4 pb-2">
            הגדרות
          </p>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Globe size={18} className="text-gray-600" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">שפה</p>
                <p className="text-xs text-gray-400">{lang === 'he' ? 'עברית' : 'English'}</p>
              </div>
            </div>
            <ChevronLeft size={16} className="text-gray-400" />
          </button>

          <div className="h-px bg-gray-100 mx-4" />

          {/* Change password */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Lock size={18} className="text-gray-600" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">שינוי סיסמה</p>
                <p className="text-xs text-gray-400">עדכן את הסיסמה שלך</p>
              </div>
            </div>
            <ChevronLeft size={16} className="text-gray-400" />
          </button>

          <div className="h-px bg-gray-100 mx-4" />

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                <LogOut size={18} className="text-red-500" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-500">התנתק</p>
              </div>
            </div>
          </button>
        </div>

        {/* App version */}
        <p className="text-center text-xs text-gray-300 py-2">Outfit v2.0 · Made with ❤️</p>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => toast('הסיסמה עודכנה בהצלחה! 🔐')}
        />
      )}
    </div>
  )
}

function QuickLink({
  href,
  icon,
  label,
  sublabel,
  color,
}: {
  href: string
  icon: string
  label: string
  sublabel: string
  color: string
}) {
  return (
    <Link href={href}>
      <div className={`${color} rounded-2xl p-4 border border-white/0 hover:shadow-sm transition-shadow active:scale-95 transition-transform`}>
        <span className="text-2xl">{icon}</span>
        <p className="text-sm font-bold text-gray-900 mt-2">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
      </div>
    </Link>
  )
}

function ChangePasswordModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit() {
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return }
    if (password.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm pb-safe">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">שינוי סיסמה</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              סיסמה חדשה
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
              dir="rtl"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
              אישור סיסמה
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="חזור על הסיסמה"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black text-right"
              dir="rtl"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 text-right">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm"
            >
              ביטול
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !password || !confirm}
              className="flex-1 py-3 rounded-2xl bg-black text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={16} />
                  עדכן
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

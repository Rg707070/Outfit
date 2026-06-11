'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { User, Mail, Lock, Eye, EyeOff, Shirt, LayoutGrid, Clock } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

interface Stats {
  wardrobeCount: number
  outfitsCount: number
  historyCount: number
}

export default function ProfilePage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [stats, setStats] = useState<Stats>({ wardrobeCount: 0, outfitsCount: 0, historyCount: 0 })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const { toast } = useToast()
  const { t } = useLang()
  const supabase = createClient()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email ?? '')

    const [{ data: profile }, { count: wardrobeCount }, { count: outfitsCount }, { count: historyCount }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('wardrobe_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('outfits').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('outfit_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    setFullName(profile?.full_name ?? user.user_metadata?.full_name ?? '')
    setStats({
      wardrobeCount: wardrobeCount ?? 0,
      outfitsCount: outfitsCount ?? 0,
      historyCount: historyCount ?? 0,
    })
    setLoadingProfile(false)
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, full_name: fullName })
    await supabase.auth.updateUser({ data: { full_name: fullName } })
    setSavingName(false)
    toast(t.profile.nameUpdated)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast(t.profile.passwordTooShort, 'error')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      toast(error.message, 'error')
    } else {
      setNewPassword('')
      toast(t.profile.passwordUpdated)
    }
  }

  if (loadingProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t.profile.title}</h1>
        <p className="text-gray-500 text-sm mt-1">{email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Shirt, label: t.profile.statItems, value: stats.wardrobeCount, href: '/wardrobe' },
          { icon: LayoutGrid, label: t.profile.statOutfits, value: stats.outfitsCount, href: '/outfits' },
          { icon: Clock, label: t.profile.statWorn, value: stats.historyCount, href: '/history' },
        ].map(({ icon: Icon, label, value, href }) => (
          <a key={label} href={href} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow text-center group">
            <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center mx-auto mb-3 transition-colors">
              <Icon size={18} className="text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </a>
        ))}
      </div>

      {/* Edit name */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={16} />
          {t.profile.personalInfo}
        </h2>
        <form onSubmit={saveName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.profile.fullName}</label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder={t.profile.namePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.profile.email}</label>
            <div className="relative">
              <Mail size={16} className="absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 pe-9 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{t.profile.emailLocked}</p>
          </div>
          <Button type="submit" disabled={savingName}>
            {savingName ? t.profile.saving : t.profile.saveChanges}
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={16} />
          {t.profile.changePassword}
        </h2>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.profile.newPassword}</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t.profile.passwordPlaceholder}
                className="ps-10"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={savingPassword || !newPassword} variant="secondary">
            {savingPassword ? t.profile.updating : t.profile.updatePassword}
          </Button>
        </form>
      </div>
    </div>
  )
}

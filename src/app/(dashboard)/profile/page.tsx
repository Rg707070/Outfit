'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { User, Camera, Save, Lock, Shirt, LayoutGrid, Clock } from 'lucide-react'

export default function ProfilePage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  const [stats, setStats] = useState({ outfits: 0, items: 0, history: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email ?? '')

    const [{ data: prof }, { count: outfits }, { count: items }, { count: history }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('outfits').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('wardrobe_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('outfit_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    if (prof) {
      setProfile(prof)
      setFullName(prof.full_name ?? '')
      setUsername(prof.username ?? '')
      setIsPublic(prof.is_public ?? false)
    }
    setStats({ outfits: outfits ?? 0, items: items ?? 0, history: history ?? 0 })
    setLoading(false)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let avatar_url = profile?.avatar_url ?? null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error } = await supabase.storage.from('wardrobe').upload(path, avatarFile, {
        upsert: true,
        contentType: avatarFile.type,
      })
      if (!error) {
        const { data } = supabase.storage.from('wardrobe').getPublicUrl(path)
        avatar_url = data.publicUrl + `?t=${Date.now()}`
      }
    }

    const { error } = await supabase.from('profiles').update({
      full_name: fullName || null,
      username: username || null,
      is_public: isPublic,
      avatar_url,
    }).eq('id', user.id)

    setSaving(false)
    setSaveMsg(error ? 'שגיאה בשמירה' : 'הפרופיל עודכן בהצלחה ✓')
    if (!error) {
      setAvatarFile(null)
      loadAll()
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwMsg('הסיסמאות אינן תואמות')
      return
    }
    if (newPassword.length < 6) {
      setPwMsg('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    setPwSaving(true)
    setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) {
      setPwMsg('שגיאה בעדכון הסיסמה')
    } else {
      setPwMsg('הסיסמה עודכנה בהצלחה ✓')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const avatarSrc = avatarPreview ?? profile?.avatar_url ?? null

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900">פרופיל</h1>
        <span className="text-2xl">👤</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: LayoutGrid, label: 'לוקים', value: stats.outfits },
          { icon: Shirt, label: 'פריטים', value: stats.items },
          { icon: Clock, label: 'היסטוריה', value: stats.history },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-1">
            <Icon size={20} className="text-gray-400" />
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Edit Profile */}
      <form onSubmit={handleSaveProfile} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">עריכת פרופיל</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div
            className="relative w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-gray-200 hover:border-black transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-gray-400" />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
              <Camera size={20} className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{fullName || 'שם לא הוגדר'}</p>
            <p className="text-xs text-gray-400">{email}</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-gray-500 underline mt-1">
              החלף תמונה
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="השם שלך"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם משתמש</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsPublic(v => !v)}
              className={`w-10 h-6 rounded-full transition-colors ${isPublic ? 'bg-black' : 'bg-gray-200'} relative`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPublic ? 'right-1' : 'right-5'}`} />
            </div>
            <span className="text-sm text-gray-700">פרופיל ציבורי</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <Save size={15} />
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
          {saveMsg && (
            <span className={`text-sm ${saveMsg.includes('שגיאה') ? 'text-red-500' : 'text-green-600'}`}>
              {saveMsg}
            </span>
          )}
        </div>
      </form>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">שינוי סיסמה</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה חדשה</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימות סיסמה</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="הקלד שוב"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pwSaving || !newPassword}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {pwSaving ? 'מעדכן...' : 'עדכן סיסמה'}
          </button>
          {pwMsg && (
            <span className={`text-sm ${pwMsg.includes('שגיאה') || pwMsg.includes('אינן') || pwMsg.includes('חייבת') ? 'text-red-500' : 'text-green-600'}`}>
              {pwMsg}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

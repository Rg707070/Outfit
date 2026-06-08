'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/contexts/auth-context'
import { useQuery } from '@tanstack/react-query'
import { validateImageFile } from '@/lib/validations'
import { User, Mail, Lock, Eye, EyeOff, Shirt, LayoutGrid, Clock, Camera } from 'lucide-react'

interface Stats {
  wardrobeCount: number
  outfitsCount: number
  historyCount: number
}

export default function ProfilePage() {
  const [editedFullName, setEditedFullName] = useState<string | undefined>(undefined)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [
        { data: profile },
        { count: wardrobeCount },
        { count: outfitsCount },
        { count: historyCount },
      ] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', user!.id).single(),
        supabase
          .from('wardrobe_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id),
        supabase
          .from('outfits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id),
        supabase
          .from('outfit_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user!.id),
      ])
      return {
        fullName: profile?.full_name ?? user!.user_metadata?.full_name ?? '',
        avatarUrl: profile?.avatar_url ?? null,
        stats: {
          wardrobeCount: wardrobeCount ?? 0,
          outfitsCount: outfitsCount ?? 0,
          historyCount: historyCount ?? 0,
        } as Stats,
      }
    },
  })

  const fullName = editedFullName ?? profileData?.fullName ?? ''

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const validationError = validateImageFile(file)
    if (validationError) {
      toast(validationError, 'error')
      return
    }
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('wardrobe')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('wardrobe').getPublicUrl(path)
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: data.publicUrl })
      setAvatarPreview(data.publicUrl)
      toast('תמונת הפרופיל עודכנה ✓')
    } catch {
      toast('שגיאה בהעלאת תמונת הפרופיל', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSavingName(true)
    try {
      await supabase.from('profiles').upsert({ id: user.id, full_name: fullName })
      await supabase.auth.updateUser({ data: { full_name: fullName } })
      toast('השם עודכן בהצלחה ✓')
    } catch {
      toast('שגיאה בשמירת השם', 'error')
    } finally {
      setSavingName(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast('הסיסמה חייבת להיות לפחות 6 תווים', 'error')
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      toast('הסיסמה עודכנה בהצלחה 🔒')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'שגיאה בעדכון הסיסמה', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  if (authLoading || loadingProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  const stats = profileData?.stats
  const currentAvatar = avatarPreview ?? profileData?.avatarUrl

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-5">
        {/* Avatar */}
        <label className="relative cursor-pointer group">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex items-center justify-center">
            {currentAvatar ? (
              <Image src={currentAvatar} alt="אווטאר" fill className="object-cover" sizes="64px" />
            ) : (
              <span className="text-2xl">👤</span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              {uploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={18} className="text-white" />
              )}
            </div>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            className="sr-only"
            disabled={uploadingAvatar}
          />
        </label>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">הפרופיל שלי</h1>
          <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Shirt, label: 'פריטי לבוש', value: stats.wardrobeCount, href: '/wardrobe' },
            {
              icon: LayoutGrid,
              label: 'לוקים שמורים',
              value: stats.outfitsCount,
              href: '/outfits',
            },
            { icon: Clock, label: 'פעמים שנלבש', value: stats.historyCount, href: '/history' },
          ].map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-sm transition-shadow text-center group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 flex items-center justify-center mx-auto mb-3 transition-colors">
                <Icon size={18} className="text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </a>
          ))}
        </div>
      )}

      {/* Edit name */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User size={16} />
          פרטים אישיים
        </h2>
        <form onSubmit={saveName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              שם מלא
            </label>
            <Input
              value={fullName}
              onChange={(e) => setEditedFullName(e.target.value)}
              placeholder="השם שלך"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              אימייל
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 pr-9 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">לא ניתן לשנות את האימייל כרגע</p>
          </div>
          <Button type="submit" disabled={savingName}>
            {savingName ? 'שומר…' : 'שמור שינויים'}
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock size={16} />
          שינוי סיסמה
        </h2>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              סיסמה חדשה
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="pl-10"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={savingPassword || !newPassword} variant="secondary">
            {savingPassword ? 'מעדכן…' : 'עדכן סיסמה'}
          </Button>
        </form>
      </div>
    </div>
  )
}

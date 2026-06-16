'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t } = useLang()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('אימייל או סיסמה שגויים'); setLoading(false) }
    else router.push('/outfits')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-4 rounded-2xl inline-block shadow-sm shadow-rose-100/50 mb-4">
            <span className="text-5xl">👗</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Outfit</h1>
          <p className="text-stone-500 mt-2 text-sm">{t.auth.tagline}</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-xl shadow-stone-200/50 p-8">
          <h2 className="text-xl font-semibold text-stone-900 mb-6">{t.auth.signIn}</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t.auth.email}</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-stone-700">{t.auth.password}</label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? t.auth.signingIn : t.auth.signIn}
            </Button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-6">
            {t.auth.noAccount}{' '}
            <Link href="/signup" className="text-stone-900 font-semibold hover:underline underline-offset-2">
              {t.auth.signUpFree}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Check } from 'lucide-react'
import { useLang } from '@/lib/lang-context'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t } = useLang()
  const supabase = createClient()

  const passwordStrength = password.length === 0 ? null
    : password.length < 6 ? 'weak'
    : password.length < 10 ? 'medium'
    : 'strong'

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) { setError(error.message); setLoading(false) }
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
          <p className="text-stone-500 mt-2 text-sm">{t.auth.signupTagline}</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-xl shadow-stone-200/50 p-8">
          <h2 className="text-xl font-semibold text-stone-900 mb-6">{t.auth.createAccount}</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t.auth.fullName}</label>
              <Input
                type="text"
                placeholder={t.auth.namePlaceholder}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
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
              <label className="block text-sm font-medium text-stone-700 mb-1.5">{t.auth.password}</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
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
              {/* Password strength indicator */}
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {['weak', 'medium', 'strong'].map((level, i) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength === 'weak' && i === 0 ? 'bg-red-400' :
                          passwordStrength === 'medium' && i <= 1 ? 'bg-yellow-400' :
                          passwordStrength === 'strong' ? 'bg-emerald-500' :
                          'bg-stone-100'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    passwordStrength === 'weak' ? 'text-red-500' :
                    passwordStrength === 'medium' ? 'text-yellow-600' :
                    'text-emerald-600'
                  }`}>
                    {passwordStrength === 'weak' ? 'סיסמה חלשה' :
                     passwordStrength === 'medium' ? 'סיסמה בינונית' :
                     '✓ סיסמה חזקה'}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? t.auth.creatingAccount : t.auth.createAccount}
            </Button>
          </form>

          {/* Benefits */}
          <div className="mt-6 pt-6 border-t border-stone-100 space-y-2">
            {['ארון בגדים דיגיטלי מלא', 'בניית לוקים בקלות', 'תובנות סגנון אישי'].map(benefit => (
              <div key={benefit} className="flex items-center gap-2 text-sm text-stone-500">
                <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Check size={10} className="text-emerald-500" />
                </div>
                {benefit}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-stone-500 mt-6">
            {t.auth.alreadyAccount}{' '}
            <Link href="/login" className="text-stone-900 font-semibold hover:underline underline-offset-2">
              {t.auth.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

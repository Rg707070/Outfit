'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLang } from '@/lib/lang-context'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { t, lang, setLang } = useLang()

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">👗</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Outfit</h1>
          <p className="text-gray-500 mt-2">{t.auth.signupTagline}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t.auth.createAccount}</h2>
            <button
              onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
              className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              {lang === 'he' ? 'EN' : 'עב'}
            </button>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.auth.fullName}</label>
              <Input type="text" placeholder={t.auth.namePlaceholder} value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.auth.email}</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.auth.password}</label>
              <Input type="password" placeholder={t.auth.passwordPlaceholder} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? t.auth.creatingAccount : t.auth.createAccount}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t.auth.alreadyAccount}{' '}
            <Link href="/login" className="text-black font-medium hover:underline">{t.auth.signIn}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

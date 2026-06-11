'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Shirt, CalendarDays, ShoppingBag, Clock,
  Sparkles, LogOut, User, Star, BarChart3, Home
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'

const navItems = [
  { href: '/', label: 'בית', icon: Home, exact: true },
  { href: '/wardrobe', label: 'ארון בגדים', icon: Shirt },
  { href: '/outfits', label: 'הלוקים שלי', icon: Sparkles },
  { href: '/plan', label: 'תכנון', icon: CalendarDays },
  { href: '/me', label: 'הפרופיל שלי', icon: User },
  { href: '/favorites', label: 'מועדפים', icon: Star },
  { href: '/wishlist', label: 'קניות ומשאלות', icon: ShoppingBag },
  { href: '/history', label: 'היסטוריה', icon: Clock },
  { href: '/insights', label: 'תובנות', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLang } = useLang()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex fixed top-0 bottom-0 end-0 w-64 bg-white border-s border-gray-100 flex-col z-40">
      <div className="p-6 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">👗</span>
          <span className="text-xl font-bold text-gray-900">Outfit</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href) && href !== '/'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-1">
        <button
          onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span className="text-base">🌐</span>
          {lang === 'he' ? 'English' : 'עברית'}
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          התנתק
        </button>
      </div>
    </aside>
  )
}

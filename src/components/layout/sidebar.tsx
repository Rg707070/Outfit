'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Shirt, CalendarDays, ShoppingBag, Clock,
  LayoutGrid, LogOut, User, Star, BarChart3, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'

const ALL_NAV = [
  { href: '/wardrobe',         icon: Shirt,        key: 'wardrobe'  as const },
  { href: '/outfits',          icon: LayoutGrid,   key: 'outfits'   as const },
  { href: '/outfits/discover', icon: Zap,          key: 'discover'  as const },
  { href: '/calendar',         icon: CalendarDays, key: 'calendar'  as const },
  { href: '/wishlist',         icon: ShoppingBag,  key: 'wishlist'  as const },
  { href: '/history',          icon: Clock,        key: 'history'   as const },
  { href: '/favorites',        icon: Star,         key: 'favorites' as const },
  { href: '/insights',         icon: BarChart3,    key: 'insights'  as const },
]

const MOBILE_TABS = [
  { href: '/wardrobe',         icon: Shirt,        he: 'ארון',    en: 'Wardrobe' },
  { href: '/outfits',          icon: LayoutGrid,   he: 'לוקים',   en: 'Outfits'  },
  { href: '/outfits/discover', icon: Zap,          he: 'גלה',     en: 'Explore'  },
  { href: '/calendar',         icon: CalendarDays, he: 'יומן',    en: 'Calendar' },
  { href: '/profile',          icon: User,         he: 'פרופיל',  en: 'Profile'  },
]

function active(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === '/outfits') return pathname.startsWith('/outfits/') && !pathname.startsWith('/outfits/discover')
  return pathname.startsWith(href + '/')
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ── Mobile bottom tab bar ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100/80">
        <div className="flex safe-bottom">
          {MOBILE_TABS.map(tab => {
            const on = active(pathname, tab.href)
            const label = lang === 'he' ? tab.he : tab.en
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1 transition-colors touch-manipulation select-none',
                  on ? 'text-gray-900' : 'text-gray-400',
                )}
              >
                <div className={cn(
                  'w-9 h-7 flex items-center justify-center rounded-xl transition-all duration-200',
                  on ? 'bg-black' : '',
                )}>
                  <tab.icon
                    size={18}
                    strokeWidth={on ? 2.5 : 1.8}
                    className={on ? 'text-white' : ''}
                  />
                </div>
                <span className={cn('text-[10px] leading-none', on ? 'font-semibold' : 'font-medium')}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden md:flex fixed top-0 bottom-0 start-0 w-60 bg-white border-e border-gray-100 flex-col z-40">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100">
          <Link href="/wardrobe" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center text-sm leading-none">
              👗
            </div>
            <span className="text-[15px] font-bold text-gray-900 tracking-tight">Outfit</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-px overflow-y-auto">
          {ALL_NAV.map(({ href, icon: Icon, key }) => {
            const on = active(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all',
                  on
                    ? 'bg-black text-white font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium',
                )}
              >
                <Icon size={15} strokeWidth={on ? 2.5 : 1.8} />
                {t.nav[key]}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-gray-100 space-y-px">
          <Link
            href="/profile"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all',
              active(pathname, '/profile')
                ? 'bg-black text-white font-semibold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium',
            )}
          >
            <User size={15} strokeWidth={active(pathname, '/profile') ? 2.5 : 1.8} />
            {t.nav.profile}
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} />
            {t.nav.signOut}
          </button>
          <button
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <span className="text-sm leading-none">🌐</span>
            {lang === 'he' ? 'English' : 'עברית'}
          </button>
        </div>
      </aside>
    </>
  )
}

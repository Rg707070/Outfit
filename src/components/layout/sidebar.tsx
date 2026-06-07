'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Shirt, CalendarDays, ShoppingBag, Clock,
  LayoutGrid, LogOut, User, Star, BarChart3, Zap, Menu, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { t } = useLang()

  const navItems = [
    { href: '/wardrobe', label: t.nav.wardrobe, icon: Shirt },
    { href: '/outfits', label: t.nav.outfits, icon: LayoutGrid },
    { href: '/outfits/discover', label: t.nav.discover, icon: Zap },
    { href: '/calendar', label: t.nav.calendar, icon: CalendarDays },
    { href: '/wishlist', label: t.nav.wishlist, icon: ShoppingBag },
    { href: '/history', label: t.nav.history, icon: Clock },
    { href: '/favorites', label: t.nav.favorites, icon: Star },
    { href: '/insights', label: t.nav.insights, icon: BarChart3 },
  ]

  return (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
            pathname === href || (href !== '/outfits' && pathname.startsWith(href))
              ? 'bg-black text-white'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  )
}

function BottomLinks({ onNavigate, onSignOut }: { onNavigate?: () => void; onSignOut: () => void }) {
  const { t, lang, setLang } = useLang()

  return (
    <div className="p-4 border-t border-gray-100 space-y-1">
      <Link
        href="/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        <User size={18} />
        {t.nav.profile}
      </Link>
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut size={18} />
        {t.nav.signOut}
      </button>
      <button
        onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <span className="text-base">🌐</span>
        {lang === 'he' ? 'English' : 'עברית'}
      </button>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const close = () => setIsOpen(false)

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 right-0 left-0 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-30">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-xl hover:bg-gray-50 text-gray-600"
          aria-label="פתח תפריט"
        >
          <Menu size={22} />
        </button>
        <Link href="/outfits" className="flex items-center gap-2">
          <span className="text-xl">👗</span>
          <span className="text-lg font-bold text-gray-900">Outfit</span>
        </Link>
        <div className="w-10" />
      </header>

      {/* Mobile backdrop */}
      <div
        onClick={close}
        className="md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
      />

      {/* Mobile sliding panel */}
      <div
        className="md:hidden fixed top-0 bottom-0 bg-white flex flex-col z-50 shadow-2xl"
        style={{
          right: 0, width: '100%', maxWidth: '20rem',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <Link href="/outfits" onClick={close} className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <span className="text-xl font-bold text-gray-900">Outfit</span>
          </Link>
          <button onClick={close} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="סגור תפריט">
            <X size={20} />
          </button>
        </div>
        <NavLinks pathname={pathname} onNavigate={close} />
        <BottomLinks onNavigate={close} onSignOut={handleSignOut} />
      </div>

      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex fixed top-0 bottom-0 right-0 w-64 bg-white border-s border-gray-100 flex-col z-40">
        <div className="p-6 border-b border-gray-100">
          <Link href="/outfits" className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <span className="text-xl font-bold text-gray-900">Outfit</span>
          </Link>
        </div>
        <NavLinks pathname={pathname} />
        <BottomLinks onSignOut={handleSignOut} />
      </aside>
    </>
  )
}

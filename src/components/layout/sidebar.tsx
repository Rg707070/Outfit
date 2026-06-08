'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Shirt,
  CalendarDays,
  ShoppingBag,
  Clock,
  LayoutGrid,
  LogOut,
  User,
  Star,
  BarChart3,
  Zap,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/theme-context'

const navItems = [
  { href: '/wardrobe', label: 'ארון בגדים', icon: Shirt },
  { href: '/outfits', label: 'לוקים', icon: LayoutGrid },
  { href: '/outfits/discover', label: 'גלה לוקים', icon: Zap },
  { href: '/calendar', label: 'לוח שנה', icon: CalendarDays },
  { href: '/wishlist', label: 'קניות ורשימת משאלות', icon: ShoppingBag },
  { href: '/history', label: 'היסטוריה', icon: Clock },
  { href: '/favorites', label: 'מועדפים', icon: Star },
  { href: '/insights', label: 'תובנות', icon: BarChart3 },
]

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
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
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
          )}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  )
}

function BottomLinks({
  onNavigate,
  onSignOut,
}: {
  onNavigate?: () => void
  onSignOut: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label="החלף ערכת צבעים"
      >
        {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        {resolvedTheme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
      </button>
      <Link
        href="/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <User size={18} />
        פרופיל
      </Link>
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
      >
        <LogOut size={18} />
        התנתק
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
      <header className="md:hidden fixed top-0 right-0 left-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 z-30">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          aria-label="פתח תפריט"
        >
          <Menu size={22} />
        </button>
        <Link href="/outfits" className="flex items-center gap-2">
          <span className="text-xl">👗</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">Outfit</span>
        </Link>
        <div className="w-10" />
      </header>

      {/* Mobile backdrop */}
      <div
        onClick={close}
        className="md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      {/* Mobile sliding panel */}
      <div
        className="md:hidden fixed top-0 bottom-0 bg-white dark:bg-gray-900 flex flex-col z-50 shadow-2xl"
        style={{
          right: 0,
          width: '100%',
          maxWidth: '20rem',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <Link href="/outfits" onClick={close} className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Outfit</span>
          </Link>
          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>
        <NavLinks pathname={pathname} onNavigate={close} />
        <BottomLinks onNavigate={close} onSignOut={handleSignOut} />
      </div>

      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex fixed top-0 bottom-0 right-0 w-64 bg-white dark:bg-gray-900 border-s border-gray-100 dark:border-gray-800 flex-col z-40">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <Link href="/outfits" className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Outfit</span>
          </Link>
        </div>
        <NavLinks pathname={pathname} />
        <BottomLinks onSignOut={handleSignOut} />
      </aside>
    </>
  )
}

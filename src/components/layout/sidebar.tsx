'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Shirt, CalendarDays, ShoppingBag, Clock, Heart,
  LayoutGrid, LogOut, User, Star, Menu, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/wardrobe', label: 'ארון בגדים', icon: Shirt },
  { href: '/outfits', label: 'לוקים', icon: LayoutGrid },
  { href: '/calendar', label: 'לוח שנה', icon: CalendarDays },
  { href: '/wishlist', label: 'קניות ורשימת משאלות', icon: ShoppingBag },
  { href: '/history', label: 'היסטוריה', icon: Clock },
  { href: '/favorites', label: 'מועדפים', icon: Star },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function close() {
    setIsOpen(false)
  }

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

      {/* Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={close}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-screen w-64 bg-white border-l border-gray-100 flex flex-col z-50 transition-transform duration-300',
          // Desktop: always visible
          'md:translate-x-0',
          // Mobile: slide in/out from right
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        )}
      >
        {/* Mobile close button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100">
          <Link href="/outfits" onClick={close} className="flex items-center gap-2">
            <span className="text-xl">👗</span>
            <span className="text-lg font-bold text-gray-900">Outfit</span>
          </Link>
          <button
            onClick={close}
            className="p-2 rounded-xl hover:bg-gray-50 text-gray-400"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>

        {/* Desktop logo */}
        <div className="hidden md:block p-6 border-b border-gray-100">
          <Link href="/outfits" className="flex items-center gap-2">
            <span className="text-2xl">👗</span>
            <span className="text-xl font-bold text-gray-900">Outfit</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <Link
            href="/profile"
            onClick={close}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <User size={18} />
            פרופיל
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            התנתק
          </button>
        </div>
      </aside>
    </>
  )
}

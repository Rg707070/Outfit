'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Shirt, CalendarDays, ShoppingBag, Clock, Heart,
  LayoutGrid, LogOut, User, Star
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed right-0 top-0 h-screen w-64 bg-white border-l border-gray-100 flex flex-col z-40">
      <div className="p-6 border-b border-gray-100">
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
  )
}

'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Shirt, Sparkles, CalendarDays, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  {
    href: '/',
    labelHe: 'בית',
    icon: Home,
    match: (p: string) => p === '/',
  },
  {
    href: '/wardrobe',
    labelHe: 'ארון',
    icon: Shirt,
    match: (p: string) => p.startsWith('/wardrobe'),
  },
  {
    href: '/outfits',
    labelHe: 'לוקים',
    icon: Sparkles,
    match: (p: string) => p.startsWith('/outfits'),
  },
  {
    href: '/plan',
    labelHe: 'תכנון',
    icon: CalendarDays,
    match: (p: string) =>
      p.startsWith('/plan') ||
      p.startsWith('/calendar') ||
      p.startsWith('/history'),
  },
  {
    href: '/me',
    labelHe: 'אני',
    icon: User,
    match: (p: string) =>
      p.startsWith('/me') ||
      p.startsWith('/profile') ||
      p.startsWith('/favorites') ||
      p.startsWith('/wishlist') ||
      p.startsWith('/insights'),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100">
      <div className="grid grid-cols-5 pb-safe">
        {tabs.map(({ href, labelHe, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95',
                active ? 'text-black' : 'text-gray-400'
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? 'text-black' : 'text-gray-400'}
              />
              <span className={cn('text-[10px] font-semibold tracking-wide', active ? 'text-black' : 'text-gray-400')}>
                {labelHe}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

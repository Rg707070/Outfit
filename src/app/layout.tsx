import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { ReactQueryProvider } from '@/contexts/query-client'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { LangProvider } from '@/lib/lang-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Outfit — Your Digital Wardrobe',
  description: 'Manage your wardrobe, plan outfits, and share your style.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100`}
      >
        <ThemeProvider>
          <ReactQueryProvider>
            <AuthProvider>
              <LangProvider>
                <ToastProvider>{children}</ToastProvider>
              </LangProvider>
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

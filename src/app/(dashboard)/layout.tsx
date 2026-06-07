import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen p-8 md:mr-64 pt-16 md:pt-8">
        {children}
      </main>
    </div>
  )
}

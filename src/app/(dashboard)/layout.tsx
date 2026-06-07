import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen p-4 md:p-8 pt-16 md:pt-8 md:ms-64">
        {children}
      </main>
    </div>
  )
}

import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="mr-64 flex-1 min-h-screen p-8">
        {children}
      </main>
    </div>
  )
}

import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="md:mr-64 flex-1 min-h-screen pt-14 md:pt-0 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}

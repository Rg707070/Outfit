import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar />
      <main className="flex-1 min-h-[100dvh] p-4 md:p-8 pb-24 md:pb-8 md:ms-60">
        {children}
      </main>
    </div>
  )
}

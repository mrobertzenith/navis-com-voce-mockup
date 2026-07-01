import { Outlet } from 'react-router-dom'
import { Topbar } from '@/app/layout/Topbar'
import { Sidebar } from '@/app/layout/Sidebar'
import { BannerDemo } from '@/components/shared/BannerDemo'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <BannerDemo />
      <Topbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 bg-bg">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

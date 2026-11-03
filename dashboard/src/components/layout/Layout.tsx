import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'
import { NotificationCenter } from './NotificationCenter'
import { Toaster } from 'sonner'
import { useDashboardDataStore } from '../../store/useDashboardDataStore'
import { useBackendStatusStore } from '../../store/useBackendStatusStore'
import { Button } from '../ui/Button'

export const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { isLoading, hasLoaded, loadDashboard } = useDashboardDataStore()
  const { status } = useBackendStatusStore()

  return (
    <div className="min-h-screen bg-canvas text-charcoal flex flex-col md:flex-row antialiased">
      {/* Sonner Toast Notification System */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: '1rem',
            border: '1px solid #EAE7DF',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '13px',
          },
        }}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopNavbar onMobileMenuToggle={() => setIsMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          {!hasLoaded && isLoading && status === 'Connecting' && (
            <div className="mb-5 rounded-xl border border-beige bg-white px-4 py-3 text-sm text-charcoal-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Connecting to restaurant backend…</span>
            </div>
          )}

          {status === 'Server Waking Up' && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>⏳ Server Waking Up — Backend is starting from sleep mode. Safe requests will resume automatically once ready.</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
                Check Readiness
              </Button>
            </div>
          )}

          {status === 'Temporarily Unavailable' && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>⚠️ Temporarily Unavailable — Backend or database is currently unreachable. Existing orders and tables remain preserved.</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
                Reconnect
              </Button>
            </div>
          )}

          <Outlet />
        </main>
      </div>

      {/* Real-time Notification Center */}
      <NotificationCenter />
    </div>
  )
}

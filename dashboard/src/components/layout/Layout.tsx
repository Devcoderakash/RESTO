import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'
import { NotificationCenter } from './NotificationCenter'
import { Toaster } from 'sonner'
import { useDashboardDataStore } from '../../store/useDashboardDataStore'
import { Button } from '../ui/Button'

export const Layout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { isLoading, hasLoaded, error, loadDashboard } = useDashboardDataStore()

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
          {!hasLoaded && isLoading && (
            <div className="mb-5 rounded-xl border border-beige bg-white px-4 py-3 text-sm text-charcoal-muted">
              Loading restaurant data…
            </div>
          )}
          {error && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <span>Dashboard API error: {error}</span>
              <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
                Retry
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

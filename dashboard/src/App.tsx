import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDashboardDataStore } from './store/useDashboardDataStore'
import { Layout } from './components/layout/Layout'
import { OrdersPage } from './pages/OrdersPage'
import { TablesPage } from './pages/TablesPage'
import { MenuPage } from './pages/MenuPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChefDashboardPage } from './pages/ChefDashboardPage'
import { WaiterDashboardPage } from './pages/WaiterDashboardPage'
import { dashboardRealtimeService } from './services/realtimeService'

const AppRoutes: React.FC = () => {
  const loadDashboard = useDashboardDataStore((state) => state.loadDashboard)
  const refreshLiveData = useDashboardDataStore((state) => state.refreshLiveData)

  useEffect(() => {
    void loadDashboard()
    // 1. Establish immediate zero-latency Real-Time SSE stream
    const disconnectRealtime = dashboardRealtimeService.connect()

    // 2. Gentle periodic background reconciliation as a safety net
    const timer = window.setInterval(() => {
      void refreshLiveData()
    }, 45_000)

    return () => {
      disconnectRealtime()
      window.clearInterval(timer)
    }
  }, [loadDashboard, refreshLiveData])

  return (
    <Routes>
      {/* Explicit redirect for legacy login */}
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Staff dedicated fullscreen views */}
      <Route path="/chef" element={<ChefDashboardPage />} />
      <Route path="/waiter" element={<WaiterDashboardPage />} />

      {/* Main Operations Dashboard (Direct access - No login required) */}
      <Route path="/" element={<Layout />}>
        <Route index element={<OrdersPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Fallbacks for removed legacy routes */}
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="inventory" element={<Navigate to="/orders" replace />} />
        <Route path="offers" element={<Navigate to="/menu" replace />} />
        <Route path="reports" element={<Navigate to="/" replace />} />
        <Route path="reviews" element={<Navigate to="/" replace />} />
        <Route path="customers" element={<Navigate to="/orders" replace />} />
        <Route path="overview" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
)

export default App

import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TableSelectionPage } from './pages/TableSelectionPage'
import { MenuPage } from './pages/MenuPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrderTrackingPage } from './pages/OrderTrackingPage'
import { useRestaurantStore } from './store/restaurantStore'

export function App() {
  useEffect(() => {
    useRestaurantStore.getState().fetchInfo()
  }, [])
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#22211F',
            color: '#FAF8F3',
            border: '1px solid #B99A62',
            fontFamily: 'inherit',
            fontSize: '13px',
            borderRadius: '14px',
            padding: '12px 16px',
          },
        }}
        richColors
      />
      <Routes>
        <Route path="/" element={<Navigate to="/select-table" replace />} />
        <Route path="/select-table" element={<TableSelectionPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-tracking/:orderId" element={<OrderTrackingPage />} />
        <Route path="*" element={<Navigate to="/select-table" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

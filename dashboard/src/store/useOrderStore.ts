import { create } from 'zustand'
import { toast } from 'sonner'
import { Order, OrderStatus, PaymentStatus } from '../types'
import { dashboardApi } from '../services/api'
import { usePaymentStore } from './usePaymentStore'

interface OrderState {
  orders: Order[]
  selectedOrder: Order | null
  searchQuery: string
  statusFilter: string
  tableFilter: string
  dateFilter: string
  setOrders: (orders: Order[]) => void
  setSelectedOrder: (order: Order | null) => void
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string) => void
  setTableFilter: (table: string) => void
  setDateFilter: (date: string) => void
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>
  updatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<boolean>
  cancelOrder: (orderId: string, reason: string) => Promise<boolean>
  resetOrders: () => void
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  selectedOrder: null,
  searchQuery: '',
  statusFilter: 'ALL',
  tableFilter: 'ALL',
  dateFilter: 'ALL',
  setOrders: (orders) => set({ orders }),
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setTableFilter: (table) => set({ tableFilter: table }),
  setDateFilter: (date) => set({ dateFilter: date }),
  updateOrderStatus: async (orderId, status) => {
    try {
      await dashboardApi.updateOrderStatus(orderId, status)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Order status could not be updated.')
      return false
    }
    set((state) => {
      const orders = state.orders.map((order) =>
        order.id === orderId
          ? { ...order, orderStatus: status, updatedAt: new Date().toISOString() }
          : order,
      )
      return {
        orders,
        selectedOrder: state.selectedOrder?.id === orderId
          ? orders.find((order) => order.id === orderId) ?? null
          : state.selectedOrder,
      }
    })
    return true
  },
  updatePaymentStatus: async (orderId, paymentStatus) => {
    if (paymentStatus !== 'Paid') {
      toast.error('Only recording a completed payment is supported here.')
      return false
    }
    let paymentId = usePaymentStore.getState().transactions.find((payment) => payment.orderId === orderId)?.id
    try {
      if (!paymentId) {
        paymentId = (await dashboardApi.createPayment(orderId)).id
      }
      await dashboardApi.updatePaymentStatus(paymentId, 'completed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment could not be recorded.')
      return false
    }
    set((state) => ({
      orders: state.orders.map((order) => order.id === orderId
        ? { ...order, paymentStatus: 'Paid' }
        : order),
      selectedOrder: state.selectedOrder?.id === orderId
        ? { ...state.selectedOrder, paymentStatus: 'Paid' }
        : state.selectedOrder,
    }))
    try {
      usePaymentStore.getState().setTransactions(await dashboardApi.getPayments())
    } catch (error) {
      toast.error(error instanceof Error
        ? `Payment was recorded, but the ledger could not be refreshed: ${error.message}`
        : 'Payment was recorded, but the ledger could not be refreshed.')
    }
    return true
  },
  cancelOrder: async (orderId, reason) => {
    try {
      await dashboardApi.updateOrderStatus(orderId, 'Cancelled', reason)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Order could not be cancelled.')
      return false
    }
    set((state) => {
      const orders = state.orders.map((order) =>
        order.id === orderId
          ? { ...order, orderStatus: 'Cancelled' as OrderStatus, cancelledReason: reason, updatedAt: new Date().toISOString() }
          : order,
      )
      return {
        orders,
        selectedOrder: state.selectedOrder?.id === orderId
          ? orders.find((order) => order.id === orderId) ?? null
          : state.selectedOrder,
      }
    })
    return true
  },
  resetOrders: () => {
    toast.error('Orders cannot be reset from the dashboard.')
  },
}))

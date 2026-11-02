import { create } from 'zustand'
import { toast } from 'sonner'
import { PaymentTransaction } from '../types'
import { dashboardApi } from '../services/api'

interface PaymentState {
  transactions: PaymentTransaction[]
  isLoading: boolean
  isRefreshing: boolean
  hasLoadedOnce: boolean
  error: string | null
  searchQuery: string
  methodFilter: string
  statusFilter: string
  dateFilter: string
  selectedTransaction: PaymentTransaction | null
  setSearchQuery: (query: string) => void
  setMethodFilter: (method: string) => void
  setStatusFilter: (status: string) => void
  setDateFilter: (date: string) => void
  setSelectedTransaction: (txn: PaymentTransaction | null) => void
  setTransactions: (transactions: PaymentTransaction[]) => void
  fetchPayments: () => Promise<PaymentTransaction[]>
  refundTransaction: (id: string) => Promise<boolean>
}

const CACHE_KEY = 'resto_cache_dashboard_payments'

function getInitialCachedPayments(): PaymentTransaction[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return []
}

export const usePaymentStore = create<PaymentState>((set, get) => {
  const initialPayments = getInitialCachedPayments()
  return {
    transactions: initialPayments,
    isLoading: initialPayments.length === 0,
    isRefreshing: false,
    hasLoadedOnce: initialPayments.length > 0,
    error: null,
    searchQuery: '',
    methodFilter: 'ALL',
    statusFilter: 'ALL',
    dateFilter: 'ALL',
    selectedTransaction: null,
    setSearchQuery: (query) => set({ searchQuery: query }),
    setMethodFilter: (method) => set({ methodFilter: method }),
    setStatusFilter: (status) => set({ statusFilter: status }),
    setDateFilter: (date) => set({ dateFilter: date }),
    setSelectedTransaction: (txn) => set({ selectedTransaction: txn }),
    setTransactions: (transactions) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(transactions))
      } catch {}
      set({ transactions, hasLoadedOnce: true, isLoading: false })
    },
    fetchPayments: async () => {
      const current = get().transactions
      if (current.length > 0) {
        set({ isRefreshing: true, error: null })
      } else {
        set({ isLoading: true, error: null })
      }
      try {
        const transactions = await dashboardApi.getPayments()
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(transactions))
        } catch {}
        set({
          transactions,
          isLoading: false,
          isRefreshing: false,
          hasLoadedOnce: true,
          error: null,
        })
        return transactions
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch payments'
        console.warn('Failed to load payments:', msg)
        set({ isLoading: false, isRefreshing: false, error: msg })
        return get().transactions
      }
    },
    refundTransaction: async (id) => {
      try {
        await dashboardApi.updatePaymentStatus(id, 'refunded')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Payment refund could not be recorded.')
        return false
      }
      set((state) => {
        const transactions = state.transactions.map((transaction) =>
          transaction.id === id ? { ...transaction, status: 'Refunded' as const } : transaction,
        )
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(transactions))
        } catch {}
        return {
          transactions,
          selectedTransaction: state.selectedTransaction?.id === id
            ? { ...state.selectedTransaction, status: 'Refunded' as const }
            : state.selectedTransaction,
        }
      })
      return true
    },
  }
})

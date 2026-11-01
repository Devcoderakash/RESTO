import { create } from 'zustand'
import { toast } from 'sonner'
import { PaymentTransaction } from '../types'
import { dashboardApi } from '../services/api'

interface PaymentState {
  transactions: PaymentTransaction[]
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
  refundTransaction: (id: string) => Promise<boolean>
}

export const usePaymentStore = create<PaymentState>((set) => ({
  transactions: [],
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
  setTransactions: (transactions) => set({ transactions }),
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
      return {
        transactions,
        selectedTransaction: state.selectedTransaction?.id === id
          ? { ...state.selectedTransaction, status: 'Refunded' as const }
          : state.selectedTransaction,
      }
    })
    return true
  },
}))

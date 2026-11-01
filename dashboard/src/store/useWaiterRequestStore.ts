import { create } from 'zustand'
import { toast } from 'sonner'
import { dashboardApi } from '../services/api'

export interface TableRequest {
  id: string
  tableNumber: string
  type: 'water' | 'cutlery' | 'assistance' | 'clean' | 'waiter' | 'other'
  details: string
  time: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface BillRequest {
  id: string
  tableNumber: string
  orderId?: string
  paymentPreference: 'cash' | 'upi' | 'card'
  amount: number
  time: string
  status: 'pending' | 'completed'
}

interface WaiterRequestState {
  tableRequests: TableRequest[]
  billRequests: BillRequest[]
  completeTableRequest: (id: string) => Promise<boolean>
  completeBillRequest: (id: string) => Promise<boolean>
  setRequests: (requests: { tableRequests: TableRequest[]; billRequests: BillRequest[] }) => void
  resetRequests: () => void
}

export const useWaiterRequestStore = create<WaiterRequestState>((set) => ({
  tableRequests: [],
  billRequests: [],
  completeTableRequest: async (id) => {
    try {
      await dashboardApi.updateServiceRequestStatus(id, 'completed')
      set((state) => ({
        tableRequests: state.tableRequests.map((request) =>
          request.id === id ? { ...request, status: 'completed' } : request,
        ),
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request could not be completed.')
      return false
    }
  },
  completeBillRequest: async (id) => {
    try {
      await dashboardApi.updateServiceRequestStatus(id, 'completed')
      set((state) => ({
        billRequests: state.billRequests.map((request) =>
          request.id === id ? { ...request, status: 'completed' } : request,
        ),
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bill request could not be completed.')
      return false
    }
  },
  setRequests: (requests) => set(requests),
  resetRequests: () => {
    toast.error('Requests cannot be reset from the dashboard.')
  },
}))

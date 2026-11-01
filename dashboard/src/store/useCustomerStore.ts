import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Customer } from '../types'

interface CustomerState {
  customers: Customer[]
  selectedCustomer: Customer | null
  searchQuery: string
  tierFilter: string
  setSelectedCustomer: (customer: Customer | null) => void
  setSearchQuery: (query: string) => void
  setTierFilter: (tier: string) => void
  addCustomer: (customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'lastVisit' | 'averageRating'>) => void
  updateCustomerNote: (id: string, notes: string) => void
  resetCustomers: () => void
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      customers: [],
      selectedCustomer: null,
      searchQuery: '',
      tierFilter: 'ALL',
      setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setTierFilter: (tier) => set({ tierFilter: tier }),
      addCustomer: (data) => {
        const id = `cust-${Date.now()}`
        const newCustomer: Customer = {
          ...data,
          id,
          totalOrders: 1,
          totalSpent: 0,
          lastVisit: new Date().toISOString().slice(0, 10),
          averageRating: 5.0,
        }
        set((state) => ({
          customers: [newCustomer, ...state.customers],
        }))
      },
      updateCustomerNote: (id, notes) => {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, notes } : c)),
          selectedCustomer:
            state.selectedCustomer?.id === id ? { ...state.selectedCustomer, notes } : state.selectedCustomer,
        }))
      },
      resetCustomers: () => set({ customers: [], selectedCustomer: null }),
    }),
    {
      name: 'dineflow_customers_store',
    }
  )
)


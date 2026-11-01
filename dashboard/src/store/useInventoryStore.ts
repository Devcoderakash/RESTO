import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { InventoryItem, StockStatus } from '../types'

interface InventoryState {
  items: InventoryItem[]
  searchQuery: string
  categoryFilter: string
  statusFilter: string
  selectedItem: InventoryItem | null
  setSearchQuery: (query: string) => void
  setCategoryFilter: (cat: string) => void
  setStatusFilter: (status: string) => void
  setSelectedItem: (item: InventoryItem | null) => void
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'status' | 'lastUpdated' | 'usageHistory'>) => void
  updateStock: (id: string, newStock: number, note?: string) => void
  recordStockUsage: (id: string, quantity: number, type: 'usage' | 'restock' | 'waste', note?: string) => void
  deleteInventoryItem: (id: string) => void
  resetInventory: () => void
}

function calculateStatus(current: number, min: number): StockStatus {
  if (current <= 0) return 'Out of Stock'
  if (current <= min) return 'Low Stock'
  return 'In Stock'
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      items: [],
      searchQuery: '',
      categoryFilter: 'ALL',
      statusFilter: 'ALL',
      selectedItem: null,
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (cat) => set({ categoryFilter: cat }),
      setStatusFilter: (status) => set({ statusFilter: status }),
      setSelectedItem: (item) => set({ selectedItem: item }),
      addInventoryItem: (itemData) => {
        const id = `inv-${Date.now()}`
        const status = calculateStatus(itemData.currentStock, itemData.minStock)
        const newItem: InventoryItem = {
          ...itemData,
          id,
          status,
          lastUpdated: new Date().toISOString(),
          usageHistory: [],
        }
        set((state) => ({
          items: [newItem, ...state.items],
        }))
      },
      updateStock: (id, newStock, note) => {
        const now = new Date().toISOString()
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === id) {
              const diff = newStock - item.currentStock
              const status = calculateStatus(newStock, item.minStock)
              const newRecord = {
                id: `uh-${Date.now()}`,
                date: now.slice(0, 10),
                quantity: Math.abs(diff),
                type: (diff >= 0 ? 'restock' : 'usage') as 'restock' | 'usage',
                note: note || (diff >= 0 ? 'Manual stock addition' : 'Manual stock reduction'),
              }
              return {
                ...item,
                currentStock: newStock,
                status,
                lastUpdated: now,
                usageHistory: [newRecord, ...item.usageHistory],
              }
            }
            return item
          }),
        }))
      },
      recordStockUsage: (id, quantity, type, note) => {
        const now = new Date().toISOString()
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === id) {
              let newStock = item.currentStock
              if (type === 'restock') {
                newStock += quantity
              } else {
                newStock = Math.max(0, newStock - quantity)
              }
              const status = calculateStatus(newStock, item.minStock)
              const newRecord = {
                id: `uh-${Date.now()}`,
                date: now.slice(0, 10),
                quantity,
                type,
                note: note || `${type} recorded`,
              }
              return {
                ...item,
                currentStock: newStock,
                status,
                lastUpdated: now,
                usageHistory: [newRecord, ...item.usageHistory],
              }
            }
            return item
          }),
        }))
      },
      deleteInventoryItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
          selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
        }))
      },
      resetInventory: () => set({ items: [], selectedItem: null }),
    }),
    {
      name: 'dineflow_inventory_store',
    }
  )
)


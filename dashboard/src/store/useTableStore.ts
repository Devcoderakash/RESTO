import { create } from 'zustand'
import { toast } from 'sonner'
import { Table, TableStatus } from '../types'
import { dashboardApi } from '../services/api'

interface TableState {
  tables: Table[]
  isLoading: boolean
  isRefreshing: boolean
  hasLoadedOnce: boolean
  error: string | null
  selectedTable: Table | null
  zoneFilter: string
  statusFilter: string
  setTables: (tables: Table[]) => void
  fetchTables: () => Promise<Table[]>
  setSelectedTable: (table: Table | null) => void
  setZoneFilter: (zone: string) => void
  setStatusFilter: (status: string) => void
  addTable: (tableData: Omit<Table, 'id' | 'qrUrl'>) => Promise<boolean>
  updateTable: (id: string, updates: Partial<Table>) => Promise<boolean>
  deleteTable: (id: string) => Promise<boolean>
  setTableStatus: (id: string, status: TableStatus) => Promise<boolean>
  clearTableSession: (id: string) => Promise<boolean>
  resetTables: () => void
}

function sortTables(tables: Table[]): Table[] {
  return [...tables].sort((a, b) =>
    a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true, sensitivity: 'base' })
  )
}

function getStoredTables(): Table[] {
  try {
    const raw = localStorage.getItem('resto_cache_dashboard_tables')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return sortTables(parsed)
    }
  } catch {}
  return []
}

const initialTables = getStoredTables()

export const useTableStore = create<TableState>((set, get) => ({
  tables: initialTables,
  isLoading: initialTables.length === 0,
  isRefreshing: false,
  hasLoadedOnce: initialTables.length > 0,
  error: null,
  selectedTable: null,
  zoneFilter: 'ALL',
  statusFilter: 'ALL',
  setTables: (tables) => {
    const sorted = sortTables(tables)
    try {
      localStorage.setItem('resto_cache_dashboard_tables', JSON.stringify(sorted))
    } catch {}
    set({ tables: sorted, hasLoadedOnce: true, isLoading: false })
  },
  fetchTables: async () => {
    const current = get().tables
    if (current.length > 0) {
      set({ isRefreshing: true, error: null })
    } else {
      set({ isLoading: true, error: null })
    }
    try {
      const tables = await dashboardApi.getTables()
      const sorted = sortTables(tables)
      try {
        localStorage.setItem('resto_cache_dashboard_tables', JSON.stringify(sorted))
      } catch {}
      set({
        tables: sorted,
        isLoading: false,
        isRefreshing: false,
        hasLoadedOnce: true,
        error: null,
      })
      return sorted
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load tables.'
      console.warn('Failed to fetch tables:', message)
      // Never wipe existing tables on error!
      set({
        isLoading: false,
        isRefreshing: false,
        error: message,
      })
      return get().tables
    }
  },
  setSelectedTable: (table) => set({ selectedTable: table }),
  setZoneFilter: (zone) => set({ zoneFilter: zone }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  addTable: async (tableData) => {
    try {
      const table = await dashboardApi.createTable(tableData)
      set((state) => {
        const withoutDup = state.tables.filter((t) => t.id !== table.id && t.tableNumber !== table.tableNumber)
        return { tables: sortTables([...withoutDup, table]) }
      })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Table could not be added.'
      toast.error(message)
      throw error // Allow TableModal to catch and show inline error message
    }
  },
  updateTable: async (id, updates) => {
    try {
      await dashboardApi.updateTable(id, updates)
      set((state) => {
        const tables = sortTables(
          state.tables.map((table) => (table.id === id ? { ...table, ...updates } : table))
        )
        return {
          tables,
          selectedTable: state.selectedTable?.id === id
            ? tables.find((table) => table.id === id) ?? null
            : state.selectedTable,
        }
      })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Table could not be updated.'
      toast.error(message)
      throw error
    }
  },
  deleteTable: async (id) => {
    try {
      await dashboardApi.deleteTable(id)
      set((state) => ({
        tables: state.tables.filter((table) => table.id !== id),
        selectedTable: state.selectedTable?.id === id ? null : state.selectedTable,
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Table could not be removed.')
      return false
    }
  },
  setTableStatus: async (id, status) => {
    try {
      await dashboardApi.setTableStatus(id, status)
      set((state) => ({
        tables: state.tables.map((table) => (table.id === id ? { ...table, status } : table)),
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Table status could not be changed.')
      return false
    }
  },
  clearTableSession: async (id) => {
    const table = get().tables.find((item) => item.id === id)
    if (!table) {
      toast.error('Table not found.')
      return false
    }
    return get().setTableStatus(id, 'Cleaning')
  },
  resetTables: () => {
    toast.error('Tables cannot be reset from the dashboard.')
  },
}))

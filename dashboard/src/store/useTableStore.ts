import { create } from 'zustand'
import { toast } from 'sonner'
import { Table, TableStatus } from '../types'
import { dashboardApi } from '../services/api'

interface TableState {
  tables: Table[]
  selectedTable: Table | null
  zoneFilter: string
  statusFilter: string
  setTables: (tables: Table[]) => void
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

export const useTableStore = create<TableState>((set, get) => ({
  tables: [],
  selectedTable: null,
  zoneFilter: 'ALL',
  statusFilter: 'ALL',
  setTables: (tables) => set({ tables }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setZoneFilter: (zone) => set({ zoneFilter: zone }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  addTable: async (tableData) => {
    try {
      const table = await dashboardApi.createTable(tableData)
      set((state) => ({ tables: [...state.tables, table] }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Table could not be added.')
      return false
    }
  },
  updateTable: async (id, updates) => {
    try {
      await dashboardApi.updateTable(id, updates)
      set((state) => {
        const tables = state.tables.map((table) =>
          table.id === id ? { ...table, ...updates } : table,
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
      toast.error(error instanceof Error ? error.message : 'Table could not be updated.')
      return false
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
        tables: state.tables.map((table) => table.id === id ? { ...table, status } : table),
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

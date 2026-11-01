import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TableState {
  currentTable: string
  hasSelectedTable: boolean
  isScannedFromQR: boolean
  guestName: string
  guestCount: number
  setTable: (table: string, isFromQR?: boolean) => void
  clearTable: () => void
  setGuestDetails: (name: string, count: number) => void
}

export const useTableStore = create<TableState>()(
  persist(
    (set) => ({
      currentTable: '',
      hasSelectedTable: false, // flag indicating whether user explicitly went through table selection
      isScannedFromQR: false,
      guestName: '',
      guestCount: 2,
      setTable: (table: string, isFromQR = false) => {
        const formatted = table.padStart(2, '0')
        set({ currentTable: formatted, hasSelectedTable: true, isScannedFromQR: isFromQR })
      },
      clearTable: () => {
        set({ currentTable: '', hasSelectedTable: false, isScannedFromQR: false })
      },
      setGuestDetails: (name: string, count: number) => {
        set({ guestName: name, guestCount: count })
      },
    }),
    {
      name: 'dineflow_table_context',
    }
  )
)

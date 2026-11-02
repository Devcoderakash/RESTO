import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TableState {
  currentTable: string
  currentTableId?: string
  hasSelectedTable: boolean
  isScannedFromQR: boolean
  guestName: string
  guestCount: number
  setTable: (table: string, isFromQR?: boolean, tableId?: string) => void
  clearTable: () => void
  setGuestDetails: (name: string, count: number) => void
}

function getStoredTableContext() {
  try {
    const raw = localStorage.getItem('dineflow_table_context')
    if (raw) {
      const parsed = JSON.parse(raw)
      const st = parsed?.state
      if (st && st.currentTable) {
        return {
          currentTable: String(st.currentTable).padStart(2, '0'),
          currentTableId: st.currentTableId,
          hasSelectedTable: Boolean(st.hasSelectedTable ?? true),
          isScannedFromQR: Boolean(st.isScannedFromQR),
          guestName: st.guestName || '',
          guestCount: Number(st.guestCount) || 2,
        }
      }
    }
  } catch {}
  return {
    currentTable: '',
    currentTableId: undefined,
    hasSelectedTable: false,
    isScannedFromQR: false,
    guestName: '',
    guestCount: 2,
  }
}

const initialContext = getStoredTableContext()

export const useTableStore = create<TableState>()(
  persist(
    (set) => ({
      currentTable: initialContext.currentTable,
      currentTableId: initialContext.currentTableId,
      hasSelectedTable: initialContext.hasSelectedTable,
      isScannedFromQR: initialContext.isScannedFromQR,
      guestName: initialContext.guestName,
      guestCount: initialContext.guestCount,
      setTable: (table: string, isFromQR = false, tableId?: string) => {
        const formatted = table.padStart(2, '0')
        set({
          currentTable: formatted,
          currentTableId: tableId,
          hasSelectedTable: true,
          isScannedFromQR: isFromQR,
        })
      },
      clearTable: () => {
        set({
          currentTable: '',
          currentTableId: undefined,
          hasSelectedTable: false,
          isScannedFromQR: false,
        })
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

import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QrCode, AlertTriangle, Check } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { useTableStore } from '../../store/tableStore'
import { useCartStore } from '../../store/cartStore'
import { toast } from 'sonner'
import { ApiTable, getAvailableTables } from '../../services/api'

interface TableSwitchModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TableSwitchModal: React.FC<TableSwitchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentTable, setTable } = useTableStore()
  const { items, clearCart } = useCartStore()

  const [tables, setTables] = useState<ApiTable[]>([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [tableLoadError, setTableLoadError] = useState<string | null>(null)
  const [pendingTable, setPendingTable] = useState<string | null>(null)
  const [showCartWarning, setShowCartWarning] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setIsLoadingTables(true)
    getAvailableTables()
      .then((response) => {
        if (active) {
          setTables(Array.isArray(response) ? response : response.tables)
          setTableLoadError(null)
        }
      })
      .catch((error: unknown) => {
        if (active) setTableLoadError(error instanceof Error ? error.message : 'Unable to load table availability.')
      })
      .finally(() => {
        if (active) setIsLoadingTables(false)
      })
    return () => {
      active = false
    }
  }, [isOpen])

  const handleSelectTable = (tableNum: string, isFromQR = false) => {
    const formatted = tableNum.padStart(2, '0')
    const table = tables.find((candidate) => candidate.number.padStart(2, '0') === formatted)
    if (!table || (table.status.toLowerCase() !== 'available' && formatted !== currentTable)) {
      toast.error(`Table ${formatted} is not available. Please choose another table.`)
      return
    }
    if (formatted === currentTable) {
      onClose()
      return
    }

    if (items.length > 0) {
      // Must ask confirmation before switching cart context!
      setPendingTable(formatted)
      setShowCartWarning(true)
    } else {
      executeSwitch(formatted, isFromQR)
    }
  }

  const executeSwitch = (tableNum: string, isFromQR = false) => {
    setTable(tableNum, isFromQR)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('table', tableNum)
    navigate({ search: newParams.toString() }, { replace: true })
    
    toast.success(`Active dining table set to Table ${tableNum}`)
    setShowCartWarning(false)
    setPendingTable(null)
    onClose()
  }

  const handleConfirmSwitchWithCartClear = () => {
    if (pendingTable) {
      clearCart()
      executeSwitch(pendingTable, false)
      toast.info('Previous cart was cleared for the new table')
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        setShowCartWarning(false)
        setPendingTable(null)
        onClose()
      }}
      title="Table Context & QR Simulator"
      description="Select or scan your restaurant table to view the table-specific menu."
      maxWidth="md"
    >
      {showCartWarning ? (
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-950">Switch Table Confirmation</p>
              <p className="mt-1 text-amber-800">
                You currently have <span className="font-bold">{items.length} item(s)</span> in your cart for{' '}
                <span className="font-semibold">Table {currentTable}</span>.
              </p>
              <p className="mt-2 text-xs text-amber-700">
                To prevent accidental cross-table orders, switching to <span className="font-bold">Table {pendingTable}</span> will clear your current cart.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setShowCartWarning(false)
                setPendingTable(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmSwitchWithCartClear}
            >
              Clear Cart & Switch
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-2.5">
              Available Tables
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {tables.map((table) => {
                const t = table.number.padStart(2, '0')
                const isSelected = t === currentTable
                const isAvailable = table.status.toLowerCase() === 'available' || isSelected
                return (
                  <button
                    key={t}
                    onClick={() => handleSelectTable(t)}
                    disabled={isLoadingTables || !isAvailable}
                    className={`py-3 px-2 rounded-xl text-center border font-medium transition-all ${
                      isSelected
                        ? 'border-gold bg-gold-50 text-gold-700 shadow-sm ring-1 ring-gold'
                        : !isAvailable
                        ? 'border-beige bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-beige hover:border-gold/50 bg-cream-50/50 text-charcoal hover:bg-cream-100'
                    }`}
                  >
                    <div className="text-[10px] text-charcoal-600 uppercase">Table</div>
                    <div className="text-lg font-serif font-bold text-charcoal">{t}</div>
                    {isSelected && (
                      <div className="mt-1 flex items-center justify-center text-[10px] text-gold-700 font-semibold gap-0.5">
                        <Check className="w-3 h-3" /> Active
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {isLoadingTables && <p className="mt-2 text-xs text-charcoal-600">Loading tables…</p>}
            {tableLoadError && <p role="alert" className="mt-2 text-xs text-red-700">{tableLoadError}</p>}
          </div>

          <div className="p-3.5 rounded-xl bg-cream-100/70 border border-beige-light text-xs text-charcoal-600 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-gold-700 shrink-0" />
              <span>Or choose from full floor plan</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/select-table')
              }}
              className="text-xs font-bold text-gold-700 hover:underline"
            >
              Floor Plan &rarr;
            </button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

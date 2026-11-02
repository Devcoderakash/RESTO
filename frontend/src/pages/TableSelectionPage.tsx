import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Users,
  Sparkles,
  UtensilsCrossed,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useTableStore } from '../store/tableStore'
import { useRestaurantStore } from '../store/restaurantStore'
import { DiningTable } from '../types/restaurant'
import { toast } from 'sonner'
import { ApiTable, getAvailableTables } from '../services/api'

export const TableSelectionPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentTable, setTable } = useTableStore()
  const restaurantInfo = useRestaurantStore((s) => s.info)

  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('')
  const [selectedZone, setSelectedZone] = useState<string>('ALL')
  const [tables, setTables] = useState<DiningTable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getAvailableTables()
      .then((response) => {
        const rawTables = Array.isArray(response) ? response : (response?.tables || [])
        const available = rawTables.map((table: ApiTable) => ({
          id: table.id,
          number: String(table.number || table.table_number || '').padStart(2, '0'),
          capacity: table.capacity || 4,
          zone: table.zone || 'Main Dining',
          isOccupied: String(table.status || '').toLowerCase() !== 'available',
        }))
        if (active) {
          setTables(available)
          // Default selection to current table or first available
          setSelectedTableNumber((prev) => {
            if (prev && available.some((t) => t.number === prev && !t.isOccupied)) return prev
            return (
              available.find((table) => table.number === currentTable && !table.isOccupied)?.number ||
              available.find((table) => !table.isOccupied)?.number ||
              ''
            )
          })
          setLoadError(null)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const msg = error instanceof Error ? error.message : 'Unable to connect to the table availability service.'
          setLoadError(msg)
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const zones = ['ALL', ...new Set(tables.map((table) => table.zone))]

  const filteredTables = tables.filter((t) => {
    if (selectedZone !== 'ALL' && t.zone !== selectedZone) return false
    return true
  })

  const handleSelectTable = (table: DiningTable) => {
    if (table.isOccupied) {
      toast.error(`Table ${table.number} is currently occupied by other guests. Please select an available table.`)
      return
    }
    setSelectedTableNumber(table.number)
  }

  const handleConfirmTable = () => {
    const table = tables.find((candidate) => candidate.number === selectedTableNumber)
    if (!table || table.isOccupied) {
      toast.error('Please select an available table.')
      return
    }
    setTable(selectedTableNumber, false, table.id)
    toast.success(`Seated at Table ${selectedTableNumber}`)
    navigate('/menu')
  }

  return (
    <div className="min-h-screen bg-canvas text-charcoal flex flex-col antialiased selection:bg-gold/20 selection:text-charcoal">
      {/* Top Header */}
      <header className="py-3.5 px-4 sm:px-8 border-b border-beige bg-white/95 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/menu"
            className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-charcoal p-1 -ml-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </Link>

          <div className="text-center">
            <h1 className="font-serif font-bold text-base sm:text-lg text-charcoal tracking-tight">
              Select Your Table
            </h1>
            <p className="text-[11px] text-charcoal-600 font-medium">
              {restaurantInfo?.name || 'The Olive & Ember'}
            </p>
          </div>

          <div className="w-12 flex justify-end">
            <div className="w-7 h-7 rounded-lg bg-cream-100 flex items-center justify-center text-gold-700 border border-beige">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 sm:py-7 space-y-5">
        {/* Helper Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-soft flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-700 border border-gold-200/80 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 fill-gold-700/30" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-charcoal">
              Where are you seated today?
            </h2>
            <p className="text-[11px] sm:text-xs text-charcoal-600 mt-0.5 leading-relaxed">
              Find the brass table badge at your seat, tap your corresponding table number below, and continue to your digital dining menu.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] sm:text-xs text-charcoal-600 bg-white/60 py-2.5 px-4 rounded-xl border border-beige/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gold border border-gold-600 ring-2 ring-gold/20" />
            <span className="font-semibold text-charcoal">Selected Table</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-charcoal-200" />
            <span>Occupied</span>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                selectedZone === zone
                  ? 'bg-charcoal text-white font-semibold shadow-xs'
                  : 'bg-white text-charcoal-600 border border-beige hover:bg-cream-100 hover:text-charcoal'
              }`}
            >
              {zone === 'ALL' ? 'All Sections' : zone}
            </button>
          ))}
        </div>

        {/* Table Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-3.5">
          {isLoading ? (
            <div className="col-span-full py-16 text-center space-y-3">
              <div className="w-7 h-7 mx-auto border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-charcoal-600">Verifying live table availability…</p>
            </div>
          ) : loadError ? (
            <div className="col-span-full py-12 px-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
              <AlertCircle className="w-7 h-7 text-rose-600 mx-auto" />
              <p className="text-xs sm:text-sm font-medium text-rose-800">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal bg-white px-4 py-2 rounded-xl border border-beige shadow-xs hover:bg-cream-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-charcoal-600">
              No tables found in this dining section.
            </div>
          ) : (
            filteredTables.map((table) => {
              const isSelected = selectedTableNumber === table.number
              const isOccupied = table.isOccupied

              return (
                <button
                  key={table.number}
                  type="button"
                  disabled={isOccupied}
                  onClick={() => handleSelectTable(table)}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-between min-h-[115px] relative group active:scale-[0.97] ${
                    isOccupied
                      ? 'bg-charcoal-50/70 border-beige/60 opacity-55 cursor-not-allowed'
                      : isSelected
                      ? 'bg-gold-50/90 border-2 border-gold shadow-medium ring-2 ring-gold/25'
                      : 'bg-white border-beige hover:border-gold-300 hover:shadow-soft'
                  }`}
                >
                  {/* Selected Tick Indicator */}
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full bg-gold text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}

                  {/* Table Label & Number */}
                  <div className="w-full pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600 block">
                      {table.zone || 'Table'}
                    </span>
                    <span
                      className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight block ${
                        isSelected
                          ? 'text-charcoal'
                          : isOccupied
                          ? 'text-charcoal-600'
                          : 'text-charcoal group-hover:text-gold-700'
                      }`}
                    >
                      {table.number}
                    </span>
                  </div>

                  {/* Footer: Capacity & Live Status */}
                  <div className="w-full pt-2 border-t border-beige/70 flex items-center justify-between text-[11px]">
                    <span className="text-charcoal-600 flex items-center gap-1 font-medium">
                      <Users className="w-3 h-3 opacity-70" />
                      <span>{table.capacity}</span>
                    </span>

                    <span
                      className={`font-semibold text-[10px] uppercase tracking-wider ${
                        isOccupied
                          ? 'text-rose-600'
                          : isSelected
                          ? 'text-gold-700 font-bold'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isOccupied ? 'Occupied' : isSelected ? 'Selected' : 'Available'}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </main>

      {/* Sticky Bottom Confirmation Bar */}
      <footer className="sticky bottom-0 p-3.5 sm:p-5 bg-white/95 backdrop-blur-md border-t border-beige z-30 shadow-elevated safe-bottom">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left w-full sm:w-auto">
            <span className="text-[11px] text-charcoal-600 font-medium block">Active Selection:</span>
            <span className="text-sm sm:text-base font-bold text-charcoal font-serif">
              Table {selectedTableNumber || '—'}
              <span className="text-[11px] font-sans text-charcoal-600 font-normal ml-2">
                (Orders will be expedited to this table)
              </span>
            </span>
          </div>

          <button
            onClick={handleConfirmTable}
            disabled={!selectedTableNumber || isLoading || !!loadError}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-charcoal hover:bg-emerald text-white font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            <span>Confirm & View Menu</span>
            <ArrowRight className="w-4 h-4 text-gold" />
          </button>
        </div>
      </footer>
    </div>
  )
}

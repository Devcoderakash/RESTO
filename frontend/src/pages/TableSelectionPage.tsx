import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Users,
  Flame,
  Info,
  Sparkles,
  CheckCircle2,
  XCircle,
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

  // Local selection state before confirming
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('')
  const [selectedZone, setSelectedZone] = useState<string>('ALL')
  const [tables, setTables] = useState<DiningTable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getAvailableTables()
      .then((response) => {
        const apiTables = Array.isArray(response) ? response : response.tables
        const available = apiTables.map((table: ApiTable) => ({
          number: table.number.padStart(2, '0'),
          capacity: table.capacity,
          zone: (table.zone || 'Main Dining') as DiningTable['zone'],
          isOccupied: table.status.toLowerCase() !== 'available',
        }))
        if (active) {
          setTables(available)
          setSelectedTableNumber(
            available.find((table) => table.number === currentTable && !table.isOccupied)?.number ||
              available.find((table) => !table.isOccupied)?.number ||
              ''
          )
          setLoadError(null)
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load table availability.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [currentTable])

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
    setTable(selectedTableNumber)
    toast.success(`Welcome to Table ${selectedTableNumber}!`)
    navigate('/menu')
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#22211F] flex flex-col antialiased">
      {/* Header Bar */}
      <header className="py-4 px-4 sm:px-8 border-b border-[#E9E4DA] bg-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#77736D] hover:text-[#22211F] p-1 -ml-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>

          <div className="text-center">
            <h1 className="font-serif font-bold text-base sm:text-lg text-[#22211F]">
              Select Your Table
            </h1>
            <p className="text-[11px] text-[#77736D]">{restaurantInfo?.name || 'The Olive & Ember'}</p>
          </div>

          <div className="w-12" /> {/* Balance spacer */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Helper Instructions Banner */}
        <div className="bg-white p-5 rounded-2xl border border-[#E9E4DA] shadow-soft flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#FAF6EE] text-[#B99A62] border border-[#B99A62]/30 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 fill-[#B99A62]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#22211F]">
              Where are you seated today?
            </h2>
            <p className="text-xs text-[#77736D] mt-0.5 leading-relaxed">
              Find the table number badge on your wooden dining stand, tap your table below, and continue to explore the menu.
            </p>
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#77736D]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-white border-2 border-[#E9E4DA]" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-[#FAF6EE] border-2 border-[#B99A62]" />
            <span className="font-semibold text-[#22211F]">Your Selection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-[#E5E3DF] opacity-60 border border-[#C7C3BD]" />
            <span>Occupied</span>
          </div>
        </div>

        {/* Zone Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedZone === zone
                  ? 'bg-[#22211F] text-[#FAF8F3] font-semibold shadow-xs'
                  : 'bg-white text-[#77736D] border border-[#E9E4DA] hover:bg-[#FAF8F3]'
              }`}
            >
              {zone === 'ALL' ? 'All Sections' : zone}
            </button>
          ))}
        </div>

        {/* Table Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5 sm:gap-4">
          {isLoading ? (
            <p className="col-span-full py-8 text-center text-sm text-[#77736D]">Checking table availability…</p>
          ) : loadError ? (
            <div className="col-span-full py-8 text-center">
              <p className="text-sm text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 text-sm font-semibold text-[#937844] underline"
              >
                Try again
              </button>
            </div>
          ) : filteredTables.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-[#77736D]">No tables are available in this section.</p>
          ) : filteredTables.map((table) => {
            const isSelected = selectedTableNumber === table.number
            const isOccupied = table.isOccupied

            return (
              <button
                key={table.number}
                type="button"
                disabled={isOccupied}
                onClick={() => handleSelectTable(table)}
                className={`p-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-between min-h-[120px] relative active:scale-95 ${
                  isOccupied
                    ? 'bg-[#E5E3DF]/50 border-[#C7C3BD] opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#FAF6EE] border-2 border-[#B99A62] shadow-medium ring-2 ring-[#B99A62]/20'
                    : 'bg-white border-[#E9E4DA] hover:border-[#B99A62]/60 hover:shadow-soft'
                }`}
              >
                {/* Checkmark when selected */}
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#B99A62] text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}

                {/* Table Number */}
                <div className="w-full">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77736D] block">
                    Table
                  </span>
                  <span
                    className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight ${
                      isSelected ? 'text-[#937844]' : isOccupied ? 'text-[#77736D]' : 'text-[#22211F]'
                    }`}
                  >
                    {table.number}
                  </span>
                </div>

                {/* Status info & Capacity */}
                <div className="w-full pt-2 border-t border-[#E9E4DA]/60 flex items-center justify-between text-[11px]">
                  <span className="text-[#77736D] flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{table.capacity}</span>
                  </span>

                  <span
                    className={`font-semibold ${
                      isOccupied
                        ? 'text-[#C62828]'
                        : isSelected
                        ? 'text-[#937844]'
                        : 'text-[#2E7D32]'
                    }`}
                  >
                    {isOccupied ? 'Occupied' : isSelected ? 'Selected' : 'Available'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </main>

      {/* Sticky Bottom Confirmation Bar */}
      <div className="sticky bottom-0 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-[#E9E4DA] z-30 shadow-elevated">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="text-xs text-[#77736D]">Current Selection:</p>
            <p className="text-base font-bold text-[#22211F] font-serif">
              Table {selectedTableNumber || '—'}
              <span className="text-xs font-sans text-[#77736D] font-normal ml-2">
                (All orders will be routed to this table)
              </span>
            </p>
          </div>

          <button
            onClick={handleConfirmTable}
          disabled={!selectedTableNumber || isLoading || !!loadError}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#B99A62] text-white hover:bg-[#937844] font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-gold-glow active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>View Menu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

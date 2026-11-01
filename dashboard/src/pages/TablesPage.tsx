import React, { useState } from 'react'
import {
  Grid3X3,
  Plus,
  QrCode,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Layers,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { TableCard } from '../components/tables/TableCard'
import { TableModal } from '../components/tables/TableModal'
import { TableQRModal } from '../components/tables/TableQRModal'
import { TableHistoryModal } from '../components/tables/TableHistoryModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { useTableStore } from '../store/useTableStore'
import { Table, TableStatus } from '../types'
import { toast } from 'sonner'

export const TablesPage: React.FC = () => {
  const {
    tables,
    zoneFilter,
    statusFilter,
    setZoneFilter,
    setStatusFilter,
    addTable,
    updateTable,
    deleteTable,
    setTableStatus,
    clearTableSession,
  } = useTableStore()

  const [activeTableModal, setActiveTableModal] = useState<Table | null | 'NEW'>(null)
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null)
  const [historyModalTable, setHistoryModalTable] = useState<Table | null>(null)
  const [deleteModalTable, setDeleteModalTable] = useState<Table | null>(null)

  // Zone Tabs
  const zoneTabs = [
    { id: 'ALL', label: 'All Floor Zones', count: tables.length },
    { id: 'Main Dining', label: 'Main Dining Hall', count: tables.filter((t) => t.zone === 'Main Dining').length },
    { id: 'Patio & Outdoor', label: 'Patio & Garden', count: tables.filter((t) => t.zone === 'Patio & Outdoor').length },
    { id: 'VIP Lounge', label: 'VIP Lounge', count: tables.filter((t) => t.zone === 'VIP Lounge').length },
    { id: 'Rooftop Terrace', label: 'Rooftop Terrace', count: tables.filter((t) => t.zone === 'Rooftop Terrace').length },
  ]

  // Filtered Tables
  const filteredTables = tables.filter((t) => {
    if (zoneFilter !== 'ALL' && t.zone !== zoneFilter) return false
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    return true
  })

  // Quick statistics
  const occupiedCount = tables.filter((t) => t.status !== 'Available' && t.status !== 'Cleaning').length
  const availableCount = tables.filter((t) => t.status === 'Available').length
  const billRequestedCount = tables.filter((t) => t.status === 'Bill Requested').length

  const handleSaveTable = async (data: {
    tableNumber: string
    capacity: number
    zone: 'Main Dining' | 'Patio & Outdoor' | 'VIP Lounge' | 'Rooftop Terrace'
    status: TableStatus
  }): Promise<boolean> => {
    if (activeTableModal === 'NEW') {
      if (!await addTable(data)) return false
      toast.success(`Table ${data.tableNumber} added successfully`)
    } else if (activeTableModal) {
      if (!await updateTable(activeTableModal.id, data)) return false
      toast.success(`Table ${data.tableNumber} updated`)
    }
    setActiveTableModal(null)
    return true
  }

  const handleDeleteConfirm = async () => {
    if (deleteModalTable) {
      if (!await deleteTable(deleteModalTable.id)) return
      toast.success(`Table ${deleteModalTable.tableNumber} removed`)
      setDeleteModalTable(null)
    }
  }

  const handleStatusChange = async (tableId: string, status: TableStatus) => {
    if (await setTableStatus(tableId, status)) {
      toast.success(`Table status changed to "${status}"`)
    }
  }

  const handleClearTable = async (tableId: string) => {
    if (await clearTableSession(tableId)) {
      toast.success('Table marked for sanitization')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal">
            Table & Floor Management
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Monitor live dining sessions, generate unique table QR stands, and control turnover.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveTableModal('NEW')}
          >
            Add New Table
          </Button>
        </div>
      </div>

      {/* Summary Stat Strips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-beige shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
            Total Tables
          </p>
          <p className="text-xl font-bold font-serif text-charcoal mt-1">{tables.length}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-beige shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
            Occupied
          </p>
          <p className="text-xl font-bold font-serif text-brand mt-1">{occupiedCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-beige shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
            Available
          </p>
          <p className="text-xl font-bold font-serif text-emerald-700 mt-1">{availableCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-beige shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
            Bill Requested
          </p>
          <p className="text-xl font-bold font-serif text-amber-600 mt-1">{billRequestedCount}</p>
        </div>
      </div>

      {/* Floor Zone Tabs */}
      <Tabs
        tabs={zoneTabs}
        activeTab={zoneFilter}
        onChange={setZoneFilter}
        variant="pills"
      />

      {/* Status Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-charcoal-muted">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-beige rounded-xl px-3 py-1.5 text-xs text-charcoal font-medium focus:outline-none focus:border-brand cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Ordering">Ordering</option>
            <option value="Food Preparing">Food Preparing</option>
            <option value="Food Ready">Food Ready</option>
            <option value="Bill Requested">Bill Requested</option>
            <option value="Cleaning">Cleaning</option>
          </select>
        </div>

        <p className="text-xs text-charcoal-muted hidden sm:block">
          Showing {filteredTables.length} table{filteredTables.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
        <EmptyState
          title="No tables found in this zone"
          description="Try selecting a different floor zone or reset your status filter."
          actionLabel="Show All Tables"
          onAction={() => {
            setZoneFilter('ALL')
            setStatusFilter('ALL')
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onEdit={(t) => setActiveTableModal(t)}
              onDelete={(t) => setDeleteModalTable(t)}
              onShowQR={(t) => setQrModalTable(t)}
              onShowHistory={(t) => setHistoryModalTable(t)}
              onChangeStatus={handleStatusChange}
              onClearSession={handleClearTable}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Table Modal */}
      <TableModal
        table={activeTableModal === 'NEW' ? null : activeTableModal}
        isOpen={!!activeTableModal}
        onClose={() => setActiveTableModal(null)}
        onSave={handleSaveTable}
      />

      {/* Table QR Stand Modal */}
      <TableQRModal
        table={qrModalTable}
        isOpen={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
      />

      {/* Table History Modal */}
      <TableHistoryModal
        table={historyModalTable}
        isOpen={!!historyModalTable}
        onClose={() => setHistoryModalTable(null)}
      />

      {/* Delete Table Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteModalTable}
        onClose={() => setDeleteModalTable(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete Table ${deleteModalTable?.tableNumber}?`}
        message="Are you sure you want to delete this table from your restaurant floor plan? Any existing QR code printed for this table will no longer be routed."
        confirmText="Delete Table"
      />
    </div>
  )
}

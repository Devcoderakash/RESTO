import React from 'react'
import { Card } from '../ui/Card'
import { Table, TableStatus } from '../../types'
import { formatCurrency, getStatusBadgeStyles } from '../../lib/utils'
import {
  Users,
  QrCode,
  Clock,
  MoreVertical,
  Receipt,
  RotateCcw,
  History,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

export interface TableCardProps {
  table: Table
  onEdit: (table: Table) => void
  onDelete: (table: Table) => void
  onShowQR: (table: Table) => void
  onShowHistory: (table: Table) => void
  onChangeStatus: (tableId: string, status: TableStatus) => void
  onClearSession: (tableId: string) => void
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onEdit,
  onDelete,
  onShowQR,
  onShowHistory,
  onChangeStatus,
  onClearSession,
}) => {
  const badge = getStatusBadgeStyles(table.status)

  // Status transitions
  const isAvailable = table.status === 'Available'
  const isCleaning = table.status === 'Cleaning'
  const isBillRequested = table.status === 'Bill Requested'
  const hasActiveOrder = !!table.currentOrderId

  const statusOptions: TableStatus[] = [
    'Available',
    'Occupied',
    'Ordering',
    'Food Preparing',
    'Food Ready',
    'Bill Requested',
    'Cleaning',
  ]

  return (
    <Card hoverEffect className="p-5 flex flex-col justify-between relative group border-beige/80">
      {/* Top row: Table number & Status badge */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-canvas border border-beige flex items-center justify-center font-serif text-lg font-bold text-charcoal shadow-2xs group-hover:border-brand/40 transition-colors">
              {table.tableNumber}
            </div>
            <div>
              <p className="text-xs font-semibold text-charcoal">Table {table.tableNumber}</p>
              <div className="flex items-center gap-1 text-[11px] text-charcoal-muted mt-0.5">
                <Users className="w-3 h-3 text-brand" />
                <span>{table.capacity} Seats</span>
                <span>•</span>
                <span className="truncate max-w-[100px]">{table.zone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick QR button */}
            <button
              onClick={() => onShowQR(table)}
              className="p-1.5 rounded-lg text-charcoal-muted hover:text-brand hover:bg-brand-50 transition-colors"
              title="View Table QR Stand"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={() => onShowHistory(table)}
              className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-beige-light transition-colors"
              title="Dining History"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(table)}
              className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-beige-light transition-colors"
              title="Edit Table"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(table)}
              className="p-1.5 rounded-lg text-charcoal-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Table"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current Status Pill with dropdown trigger */}
        <div className="mt-3.5 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {table.status}
          </span>

          {table.sessionStartedAt && (
            <div className="flex items-center gap-1 text-[11px] text-charcoal-muted">
              <Clock className="w-3 h-3" />
              <span>Active 38m</span>
            </div>
          )}
        </div>

        {/* Current Order & Bill Section */}
        <div className="mt-4 pt-3 border-t border-beige/60">
          {table.currentOrderId ? (
            <div className="bg-canvas/50 p-2.5 rounded-xl border border-beige/60 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-charcoal-muted">Current Ticket:</span>
                <span className="font-mono font-bold text-charcoal">{table.currentOrderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-charcoal-muted">Current Bill:</span>
                <span className="font-bold text-brand font-serif">
                  {formatCurrency(table.currentBill || 0)}
                </span>
              </div>
            </div>
          ) : isCleaning ? (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-center text-slate-700">
              Table being sanitized for next guest
            </div>
          ) : (
            <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-xs text-center text-emerald-800">
              Ready to seat guests
            </div>
          )}
        </div>
      </div>

      {/* Action Footer: Status Switcher & Reset */}
      <div className="mt-4 pt-3 border-t border-beige/60 flex items-center justify-between gap-2 text-xs">
        {/* Status Dropdown */}
        <select
          value={table.status}
          onChange={(e) => onChangeStatus(table.id, e.target.value as TableStatus)}
          className="bg-white border border-beige rounded-lg px-2 py-1 text-xs text-charcoal font-medium focus:outline-none focus:border-brand cursor-pointer truncate max-w-[140px]"
        >
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Quick clear table after checkout */}
        {!isAvailable && (
          <button
            onClick={() => onClearSession(table.id)}
            className="text-[11px] font-semibold text-brand hover:text-brand-dark flex items-center gap-1 transition-colors ml-auto"
            title="Mark as cleaned and available"
          >
            <RotateCcw className="w-3 h-3" /> Clear Table
          </button>
        )}
      </div>
    </Card>
  )
}


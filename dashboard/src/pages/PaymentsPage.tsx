import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Search,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/dashboard/StatCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { usePaymentStore } from '../store/usePaymentStore'
import { PaymentTransaction } from '../types'
import { formatCurrency, formatDateTime, getStatusBadgeStyles } from '../lib/utils'
import { exportToCSV } from '../lib/exportUtils'
import { toast } from 'sonner'

export const PaymentsPage: React.FC = () => {
  const {
    transactions,
    isLoading,
    isRefreshing,
    searchQuery,
    methodFilter,
    statusFilter,
    setSearchQuery,
    setMethodFilter,
    setStatusFilter,
    fetchPayments,
    refundTransaction,
  } = usePaymentStore()

  useEffect(() => {
    void fetchPayments()
  }, [fetchPayments])

  const [selectedTxn, setSelectedTxn] = useState<PaymentTransaction | null>(null)
  const [refundModalTxn, setRefundModalTxn] = useState<PaymentTransaction | null>(null)

  // Calculations
  const totalCollections = transactions
    .filter((t) => t.status === 'Success')
    .reduce((sum, t) => sum + t.amount, 0)

  const cardCollections = transactions
    .filter((t) => t.status === 'Success' && t.paymentMethod === 'Card')
    .reduce((sum, t) => sum + t.amount, 0)

  const upiCollections = transactions
    .filter((t) => t.status === 'Success' && (t.paymentMethod === 'UPI' || t.paymentMethod === 'Online'))
    .reduce((sum, t) => sum + t.amount, 0)

  const cashCollections = transactions
    .filter((t) => t.status === 'Success' && t.paymentMethod === 'Cash')
    .reduce((sum, t) => sum + t.amount, 0)

  const refundedTotal = transactions
    .filter((t) => t.status === 'Refunded')
    .reduce((sum, t) => sum + t.amount, 0)

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    if (methodFilter !== 'ALL' && t.paymentMethod !== methodFilter) return false
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTxn = t.id.toLowerCase().includes(q)
      const matchOrder = t.orderId.toLowerCase().includes(q)
      const matchTable = t.tableNumber.includes(q)
      if (!matchTxn && !matchOrder && !matchTable) return false
    }
    return true
  })

  const handleExportCSV = () => {
    exportToCSV(filteredTransactions, 'dineflow-payments', [
      { key: 'id', label: 'Transaction ID' },
      { key: 'orderId', label: 'Order ID' },
      { key: 'tableNumber', label: 'Table' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date' },
    ])
    toast.success('Payments log exported to CSV')
  }

  const handleConfirmRefund = async () => {
    if (refundModalTxn) {
      if (await refundTransaction(refundModalTxn.id)) {
        toast.success(`Transaction ${refundModalTxn.id} marked as Refunded`)
        setRefundModalTxn(null)
      }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal">
            Payment Management
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5 flex items-center gap-2">
            <span>Audit digital settlements, cash reconciliations, terminal receipts, and refund requests.</span>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Syncing live payments…
              </span>
            )}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleExportCSV}
        >
          Export Transactions (CSV)
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Collections"
          value={formatCurrency(totalCollections)}
          subtext="Net successful receipts"
          icon={DollarSign}
          accentColor="brand"
        />
        <StatCard
          title="Online / UPI"
          value={formatCurrency(upiCollections)}
          subtext="QR & digital payments"
          icon={CreditCard}
          accentColor="blue"
        />
        <StatCard
          title="Card Terminal"
          value={formatCurrency(cardCollections)}
          subtext="Credit & Debit POS"
          icon={CreditCard}
          accentColor="purple"
        />
        <StatCard
          title="Cash at Counter"
          value={formatCurrency(cashCollections)}
          subtext="Physical cash register"
          icon={DollarSign}
          accentColor="emerald"
        />
        <StatCard
          title="Total Refunds"
          value={formatCurrency(refundedTotal)}
          subtext="Reversed transactions"
          icon={RotateCcw}
          accentColor="amber"
        />
      </div>

      {/* Toolbar: Filters & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by Transaction ID, Order ID, or Table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-white border border-beige rounded-xl px-3 py-2 text-xs text-charcoal font-medium focus:outline-none focus:border-brand cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI / Digital</option>
              <option value="Cash">Cash</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-beige rounded-xl px-3 py-2 text-xs text-charcoal font-medium focus:outline-none focus:border-brand cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
              <option value="Failed">Failed</option>
            </select>

            {(searchQuery || methodFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setMethodFilter('ALL')
                  setStatusFilter('ALL')
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Try broadening your payment filters or search parameters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('')
            setMethodFilter('ALL')
            setStatusFilter('ALL')
          }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas/70 text-charcoal-muted uppercase text-[10px] tracking-wider border-b border-beige">
                <tr>
                  <th className="py-3.5 px-5 font-semibold">Transaction ID</th>
                  <th className="py-3.5 px-4 font-semibold">Order ID</th>
                  <th className="py-3.5 px-4 font-semibold">Table</th>
                  <th className="py-3.5 px-4 font-semibold">Method</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Tip</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige/60">
                {filteredTransactions.map((txn) => {
                  const badge = getStatusBadgeStyles(txn.status)
                  return (
                    <tr
                      key={txn.id}
                      className="hover:bg-canvas/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTxn(txn)}
                    >
                      <td className="py-4 px-5 font-bold text-charcoal font-mono">
                        {txn.id}
                      </td>
                      <td className="py-4 px-4 font-mono font-medium text-charcoal-soft">
                        {txn.orderId}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-charcoal px-2 py-0.5 rounded-md bg-beige-light border border-beige">
                          T-{txn.tableNumber}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-charcoal">
                        {txn.paymentMethod}
                      </td>
                      <td className="py-4 px-4 font-bold text-brand font-serif">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="py-4 px-4 text-emerald-700 font-medium">
                        {txn.tipAmount > 0 ? `+${formatCurrency(txn.tipAmount)}` : '—'}
                      </td>
                      <td className="py-4 px-4 text-charcoal-muted whitespace-nowrap">
                        {formatDateTime(txn.date)}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                          {txn.status}
                        </span>
                      </td>
                      <td
                        className="py-4 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTxn(txn)}
                            className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-beige-light transition-colors"
                            title="Receipt details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {txn.status === 'Success' && (
                            <button
                              onClick={() => setRefundModalTxn(txn)}
                              className="p-1.5 rounded-lg text-charcoal-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Process Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <Modal
          isOpen={!!selectedTxn}
          onClose={() => setSelectedTxn(null)}
          size="sm"
          title={`Transaction: ${selectedTxn.id}`}
          description={`Payment recorded on ${formatDateTime(selectedTxn.date)}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-canvas/50 rounded-xl border border-beige space-y-2">
              <div className="flex justify-between">
                <span className="text-charcoal-muted">Linked Order:</span>
                <span className="font-mono font-bold text-charcoal">{selectedTxn.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-muted">Dining Table:</span>
                <span className="font-semibold text-charcoal">Table {selectedTxn.tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-muted">Payment Channel:</span>
                <span className="font-semibold text-charcoal">{selectedTxn.paymentMethod}</span>
              </div>
              {selectedTxn.referenceNo && (
                <div className="flex justify-between">
                  <span className="text-charcoal-muted">Gateway Ref / Auth Code:</span>
                  <span className="font-mono text-charcoal">{selectedTxn.referenceNo}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-beige pt-2 font-bold text-sm">
                <span>Total Settled:</span>
                <span className="text-brand font-serif font-bold">
                  {formatCurrency(selectedTxn.amount)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedTxn(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Refund Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!refundModalTxn}
        onClose={() => setRefundModalTxn(null)}
        onConfirm={handleConfirmRefund}
        title={`Refund Transaction ${refundModalTxn?.id}?`}
        message={`This records ${refundModalTxn ? formatCurrency(refundModalTxn.amount) : ''} as refunded in RESTO. It does not initiate a payment-provider refund.`}
        confirmText="Mark as Refunded"
      />
    </div>
  )
}

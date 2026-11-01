import React, { useState } from 'react'
import {
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  ArrowRight,
  XCircle,
  Clock,
  RotateCcw,
  CheckCircle2,
  BellRing,
  Check,
  UtensilsCrossed,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { OrderStatusBadge } from '../components/orders/OrderStatusBadge'
import { OrderDetailDrawer } from '../components/orders/OrderDetailDrawer'
import { CancelOrderModal } from '../components/orders/CancelOrderModal'
import { InvoiceModal } from '../components/orders/InvoiceModal'
import { EmptyState } from '../components/ui/EmptyState'
import { useOrderStore } from '../store/useOrderStore'
import { useWaiterRequestStore } from '../store/useWaiterRequestStore'
import { Order, OrderStatus } from '../types'
import { formatCurrency, formatTime, getStatusBadgeStyles } from '../lib/utils'
import { exportToCSV } from '../lib/exportUtils'
import { toast } from 'sonner'

export const OrdersPage: React.FC = () => {
  const {
    orders,
    searchQuery,
    statusFilter,
    tableFilter,
    setSearchQuery,
    setStatusFilter,
    setTableFilter,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrder,
  } = useOrderStore()

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null)
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null)

  const { tableRequests, billRequests, completeTableRequest, completeBillRequest } = useWaiterRequestStore()
  const activeTableRequests = tableRequests.filter((r) => r.status === 'pending')
  const activeBillRequests = billRequests.filter((b) => b.status === 'pending')

  const getNextStatusAction = (order: Order) => {
    switch (order.orderStatus) {
      case 'New':
        return {
          label: 'Accept Order',
          nextStatus: 'Accepted' as OrderStatus,
          className: 'bg-amber-600 text-white hover:bg-amber-700',
        }
      case 'Accepted':
        return {
          label: 'Start Preparing',
          nextStatus: 'Preparing' as OrderStatus,
          className: 'bg-orange-600 text-white hover:bg-orange-700',
        }
      case 'Preparing':
        return {
          label: 'Mark Ready',
          nextStatus: 'Ready' as OrderStatus,
          className: 'bg-purple-600 text-white hover:bg-purple-700',
        }
      case 'Ready':
        return {
          label: 'Mark Served',
          nextStatus: 'Served' as OrderStatus,
          className: 'bg-emerald-700 text-white hover:bg-emerald-800',
        }
      case 'Served':
        return {
          label: 'Complete Order',
          nextStatus: 'Completed' as OrderStatus,
          className: 'bg-charcoal text-white hover:bg-charcoal-900',
        }
      default:
        return null
    }
  }

  const handleAdvanceStatus = async (order: Order, nextStatus: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, nextStatus)
      toast.success(`Order ${order.id} updated to ${nextStatus}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update order status')
    }
  }

  const statusTabs = [
    { id: 'ALL', label: 'All Orders', count: orders.length },
    { id: 'New', label: 'New', count: orders.filter((o) => o.orderStatus === 'New').length },
    { id: 'Accepted', label: 'Accepted', count: orders.filter((o) => o.orderStatus === 'Accepted').length },
    { id: 'Preparing', label: 'Preparing', count: orders.filter((o) => o.orderStatus === 'Preparing').length },
    { id: 'Ready', label: 'Ready', count: orders.filter((o) => o.orderStatus === 'Ready').length },
    { id: 'Served', label: 'Served', count: orders.filter((o) => o.orderStatus === 'Served').length },
    { id: 'Completed', label: 'Completed', count: orders.filter((o) => o.orderStatus === 'Completed').length },
    { id: 'Cancelled', label: 'Cancelled', count: orders.filter((o) => o.orderStatus === 'Cancelled').length },
  ]

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'ALL' && order.orderStatus !== statusFilter) return false
    if (tableFilter !== 'ALL' && order.tableNumber !== tableFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesId = order.id.toLowerCase().includes(q)
      const matchesCustomer = order.customerName.toLowerCase().includes(q)
      const matchesTable = order.tableNumber.includes(q)
      const matchesItem = order.items.some((i) => i.name.toLowerCase().includes(q))
      if (!matchesId && !matchesCustomer && !matchesTable && !matchesItem) return false
    }
    return true
  })

  const tableNumbers = Array.from(new Set(orders.map((o) => o.tableNumber))).sort()

  const handleExportCSV = () => {
    exportToCSV(filteredOrders, 'dineflow-orders', [
      { key: 'id', label: 'Order ID' },
      { key: 'tableNumber', label: 'Table' },
      { key: 'customerName', label: 'Customer' },
      { key: 'total', label: 'Total Amount' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'orderStatus', label: 'Order Status' },
      { key: 'createdAt', label: 'Time' },
    ])
    toast.success(`Exported ${filteredOrders.length} orders to CSV`)
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDrawerOpen(true)
  }

  const handleCancelClick = (order: Order) => {
    setCancelModalOrder(order)
  }

  const handleConfirmCancel = async (orderId: string, reason: string) => {
    const cancelled = await cancelOrder(orderId, reason)
    if (!cancelled) return
    toast.success(`Order ${orderId} was cancelled`)
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(null)
      setIsDrawerOpen(false)
    }
  }

  const handlePrintClick = (order: Order) => {
    setInvoiceModalOrder(order)
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal tracking-tight">
            Live Table Orders
          </h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Real-time feed of kitchen tickets, table deliveries, and settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
            className="text-xs font-semibold"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Live Waiter Requests Alert Banner */}
      {(activeTableRequests.length > 0 || activeBillRequests.length > 0) && (
        <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/80 shadow-soft">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping" />
              <h3 className="text-xs sm:text-sm font-bold text-charcoal flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-amber-700" />
                Active Table Requests ({activeTableRequests.length + activeBillRequests.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-900 font-medium">Requires server attention</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeTableRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3"
              >
                <div>
                  <span className="font-bold text-xs text-charcoal block">
                    Table {req.tableNumber} • {req.details || req.type}
                  </span>
                  <span className="text-[10px] text-charcoal-muted">{formatTime(req.time)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => completeTableRequest(req.id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-[11px] font-bold shrink-0 flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Handled</span>
                </button>
              </div>
            ))}

            {activeBillRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3"
              >
                <div>
                  <span className="font-bold text-xs text-charcoal block">
                    Table {req.tableNumber} • Bill Requested ({req.paymentPreference.toUpperCase()})
                  </span>
                  <span className="text-[10px] text-charcoal-muted">{formatTime(req.time)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => completeBillRequest(req.id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-[11px] font-bold shrink-0 flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Handled</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Tab Rail */}
      <div className="space-y-3">
        {/* Horizontal Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-charcoal text-white shadow-xs'
                    : 'bg-white text-charcoal-muted border border-beige hover:bg-cream-50 hover:text-charcoal'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-canvas text-charcoal'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search & Table Select Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted/70" />
            <input
              type="text"
              placeholder="Search by Order ID, Table #, Guest name, or dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-beige bg-white text-xs sm:text-sm placeholder:text-charcoal-muted/50 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-beige bg-white text-xs font-semibold text-charcoal shadow-2xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Tables</option>
              {tableNumbers.map((tbl) => (
                <option key={tbl} value={tbl}>
                  Table {tbl}
                </option>
              ))}
            </select>

            {(searchQuery || statusFilter !== 'ALL' || tableFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                  setTableFilter('ALL')
                }}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold text-charcoal-muted hover:text-charcoal hover:bg-white border border-beige transition-colors flex items-center gap-1"
                title="Reset active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List: Dual Desktop Table & Mobile Card Stack */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No table orders found"
          description="Try adjusting your status filter or clearing search keywords to see all tickets."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('')
            setStatusFilter('ALL')
            setTableFilter('ALL')
          }}
        />
      ) : (
        <>
          {/* MOBILE & TABLET CARD STACK (lg:hidden) */}
          <div className="space-y-3.5 lg:hidden">
            {filteredOrders.map((order) => {
              const payBadge = getStatusBadgeStyles(order.paymentStatus)
              const action = getNextStatusAction(order)

              return (
                <div
                  key={order.id}
                  onClick={() => handleViewDetails(order)}
                  className="p-4 rounded-2xl bg-white border border-beige shadow-soft hover:shadow-medium transition-all active:scale-[0.99] cursor-pointer space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-beige/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-charcoal">
                        #{order.id}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cream-100 text-charcoal border border-beige">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Table {order.tableNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-charcoal-muted">
                        {formatTime(order.createdAt)}
                      </span>
                      <OrderStatusBadge status={order.orderStatus} />
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-charcoal">
                      {order.customerName}
                    </div>
                    <p className="text-xs text-charcoal-muted leading-relaxed line-clamp-2">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </p>
                  </div>

                  {/* Financial & Status Action */}
                  <div className="pt-2 border-t border-beige/60 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-muted block">
                        Total Amount
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-charcoal">
                          {formatCurrency(order.total)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${payBadge.bg} ${payBadge.text} ${payBadge.border}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Quick advance status action */}
                    {action && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAdvanceStatus(order, action.nextStatus)
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5 ${action.className}`}
                      >
                        <span>{action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP HIGH-DENSITY TABLE (hidden lg:block) */}
          <div className="hidden lg:block rounded-2xl bg-white border border-beige shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas/80 text-charcoal-muted uppercase text-[10px] tracking-wider border-b border-beige">
                  <tr>
                    <th className="py-3.5 px-5 font-semibold">Order ID</th>
                    <th className="py-3.5 px-4 font-semibold">Table</th>
                    <th className="py-3.5 px-4 font-semibold">Guest</th>
                    <th className="py-3.5 px-4 font-semibold">Dishes Summary</th>
                    <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Payment</th>
                    <th className="py-3.5 px-4 font-semibold">Time</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige/60">
                  {filteredOrders.map((order) => {
                    const payBadge = getStatusBadgeStyles(order.paymentStatus)
                    const action = getNextStatusAction(order)

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-canvas/50 transition-colors cursor-pointer group"
                        onClick={() => handleViewDetails(order)}
                      >
                        <td className="py-3.5 px-5 font-bold text-charcoal font-mono">
                          {order.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-charcoal px-2.5 py-1 rounded-lg bg-cream-100 border border-beige">
                            T-{order.tableNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-charcoal">
                          {order.customerName}
                        </td>
                        <td className="py-3.5 px-4 text-charcoal-muted max-w-[200px] truncate">
                          {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-charcoal font-serif text-sm">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${payBadge.bg} ${payBadge.text} ${payBadge.border}`}
                          >
                            <span className={`w-1 h-1 rounded-full ${payBadge.dot}`} />
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-charcoal-muted whitespace-nowrap">
                          {formatTime(order.createdAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <OrderStatusBadge status={order.orderStatus} />
                        </td>
                        <td
                          className="py-3.5 px-5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {action && (
                              <button
                                onClick={() => handleAdvanceStatus(order, action.nextStatus)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1 ${action.className}`}
                              >
                                <span>{action.label}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={() => handleViewDetails(order)}
                              className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-cream-100 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handlePrintClick(order)}
                              className="p-1.5 rounded-lg text-charcoal-muted hover:text-brand hover:bg-brand-50 transition-colors"
                              title="Print Invoice"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {order.orderStatus !== 'Cancelled' &&
                              order.orderStatus !== 'Completed' && (
                                <button
                                  onClick={() => handleCancelClick(order)}
                                  className="p-1.5 rounded-lg text-charcoal-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Cancel Order"
                                >
                                  <XCircle className="w-4 h-4" />
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
          </div>
        </>
      )}

      {/* Modals & Drawers */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateStatus={updateOrderStatus}
        onCancelClick={handleCancelClick}
        onPrintClick={handlePrintClick}
        onTogglePayment={(orderId) => updatePaymentStatus(orderId, 'Paid')}
      />

      <CancelOrderModal
        order={cancelModalOrder}
        isOpen={!!cancelModalOrder}
        onClose={() => setCancelModalOrder(null)}
        onConfirm={handleConfirmCancel}
      />

      <InvoiceModal
        order={invoiceModalOrder}
        isOpen={!!invoiceModalOrder}
        onClose={() => setInvoiceModalOrder(null)}
      />
    </div>
  )
}

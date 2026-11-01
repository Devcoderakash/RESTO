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
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
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
    dateFilter,
    setSearchQuery,
    setStatusFilter,
    setTableFilter,
    setDateFilter,
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
          className: 'bg-brand text-sidebar hover:bg-brand-600',
        }
      case 'Accepted':
        return {
          label: 'Start Preparing',
          nextStatus: 'Preparing' as OrderStatus,
          className: 'bg-amber-600 text-white hover:bg-amber-700',
        }
      case 'Preparing':
        return {
          label: 'Mark Ready',
          nextStatus: 'Ready' as OrderStatus,
          className: 'bg-indigo-600 text-white hover:bg-indigo-700',
        }
      case 'Ready':
        return {
          label: 'Mark Served',
          nextStatus: 'Served' as OrderStatus,
          className: 'bg-emerald-600 text-white hover:bg-emerald-700',
        }
      case 'Served':
        return {
          label: 'Complete Order',
          nextStatus: 'Completed' as OrderStatus,
          className: 'bg-charcoal text-white hover:bg-charcoal-800',
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

  // Status Tabs
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

  // Filtered orders list
  const filteredOrders = orders.filter((order) => {
    // Status Filter
    if (statusFilter !== 'ALL' && order.orderStatus !== statusFilter) {
      return false
    }

    // Table Filter
    if (tableFilter !== 'ALL' && order.tableNumber !== tableFilter) {
      return false
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesId = order.id.toLowerCase().includes(q)
      const matchesCustomer = order.customerName.toLowerCase().includes(q)
      const matchesTable = order.tableNumber.includes(q)
      const matchesItem = order.items.some((i) => i.name.toLowerCase().includes(q))
      if (!matchesId && !matchesCustomer && !matchesTable && !matchesItem) {
        return false
      }
    }

    return true
  })

  // Unique table numbers for filter
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal">
            Order Management
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Real-time feed of live dining tickets, kitchen preparation, and customer settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCSV}
          >
            Export Orders (CSV)
          </Button>
        </div>
      </div>

      {/* Live Waiter Requests Banner if any pending */}
      {(activeTableRequests.length > 0 || activeBillRequests.length > 0) && (
        <Card className="p-4 sm:p-5 border-amber-300 bg-amber-50/60 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h3 className="text-sm font-bold text-charcoal flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-amber-600" />
                Active Table Service Requests ({activeTableRequests.length + activeBillRequests.length})
              </h3>
            </div>
            <span className="text-xs text-charcoal-muted">Requires waiter attention</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTableRequests.map((req) => (
              <div key={req.id} className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-charcoal block">
                    Table {req.tableNumber} • {req.details || req.type}
                  </span>
                  <span className="text-[10px] text-charcoal-muted">{formatTime(req.time)}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => completeTableRequest(req.id)}
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-xs py-1 px-2.5 shrink-0"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Mark Handled
                </Button>
              </div>
            ))}
            {activeBillRequests.map((req) => (
              <div key={req.id} className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-charcoal block">
                    Table {req.tableNumber} • Bill Requested ({req.paymentPreference.toUpperCase()})
                  </span>
                  <span className="text-[10px] text-charcoal-muted">{formatTime(req.time)}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => completeBillRequest(req.id)}
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-xs py-1 px-2.5 shrink-0"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Mark Handled
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <Tabs
        tabs={statusTabs}
        activeTab={statusFilter}
        onChange={setStatusFilter}
        variant="pills"
      />

      {/* Search & Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by Order ID, guest name, table, dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-40">
              <Select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
              >
                <option value="ALL">All Tables</option>
                {tableNumbers.map((tbl) => (
                  <option key={tbl} value={tbl}>
                    Table {tbl}
                  </option>
                ))}
              </Select>
            </div>

            {(searchQuery || statusFilter !== 'ALL' || tableFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('ALL')
                  setTableFilter('ALL')
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Order Table */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try adjusting your status tabs or clearing search filters to see all tickets."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery('')
            setStatusFilter('ALL')
            setTableFilter('ALL')
          }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas/70 text-charcoal-muted uppercase text-[10px] tracking-wider border-b border-beige">
                <tr>
                  <th className="py-3.5 px-5 font-semibold">Order ID</th>
                  <th className="py-3.5 px-4 font-semibold">Table</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Items Summary</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Payment</th>
                  <th className="py-3.5 px-4 font-semibold">Time</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige/60">
                {filteredOrders.map((order) => {
                  const payBadge = getStatusBadgeStyles(order.paymentStatus)
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-canvas/40 transition-colors group cursor-pointer"
                      onClick={() => handleViewDetails(order)}
                    >
                      <td className="py-4 px-5 font-bold text-charcoal font-mono">
                        {order.id}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-charcoal px-2 py-0.5 rounded-lg bg-beige-light border border-beige">
                          T-{order.tableNumber}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-charcoal">
                        {order.customerName}
                      </td>
                      <td className="py-4 px-4 text-charcoal-muted max-w-[220px] truncate">
                        {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                      </td>
                      <td className="py-4 px-4 font-bold text-charcoal">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${payBadge.bg} ${payBadge.text} ${payBadge.border}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${payBadge.dot}`} />
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-charcoal-muted whitespace-nowrap">
                        {formatTime(order.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <OrderStatusBadge status={order.orderStatus} />
                      </td>
                      <td
                        className="py-4 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          {(() => {
                            const action = getNextStatusAction(order)
                            if (!action) return null
                            return (
                              <button
                                onClick={() => handleAdvanceStatus(order, action.nextStatus)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1 ${action.className}`}
                              >
                                <span>{action.label}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )
                          })()}

                          <button
                            onClick={() => handleViewDetails(order)}
                            className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-beige-light transition-colors"
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
        </Card>
      )}

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateStatus={updateOrderStatus}
        onCancelClick={handleCancelClick}
        onPrintClick={handlePrintClick}
        onTogglePayment={(orderId) => updatePaymentStatus(orderId, 'Paid')}
      />

      {/* Cancel Order Confirmation Modal */}
      <CancelOrderModal
        order={cancelModalOrder}
        isOpen={!!cancelModalOrder}
        onClose={() => setCancelModalOrder(null)}
        onConfirm={handleConfirmCancel}
      />

      {/* Printable Invoice Modal */}
      <InvoiceModal
        order={invoiceModalOrder}
        isOpen={!!invoiceModalOrder}
        onClose={() => setInvoiceModalOrder(null)}
      />
    </div>
  )
}

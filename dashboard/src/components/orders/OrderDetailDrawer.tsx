import React, { useState } from 'react'
import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Button'
import { Order, OrderStatus } from '../../types'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { OrderStatusBadge } from './OrderStatusBadge'
import {
  Printer,
  XCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  User,
  Phone,
  MessageSquare,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

export interface OrderDetailDrawerProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onUpdateStatus: (orderId: string, status: OrderStatus) => void | boolean | Promise<void | boolean>
  onCancelClick: (order: Order) => void
  onPrintClick: (order: Order) => void
  onTogglePayment: (orderId: string) => void | boolean | Promise<void | boolean>
}

const statusOrder: OrderStatus[] = [
  'New',
  'Accepted',
  'Preparing',
  'Ready',
  'Served',
  'Completed',
]

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onCancelClick,
  onPrintClick,
  onTogglePayment,
}) => {
  const [isAdvancing, setIsAdvancing] = useState(false)
  if (!order) return null

  const currentIdx = statusOrder.indexOf(order.orderStatus)
  const nextStatus = currentIdx !== -1 && currentIdx < statusOrder.length - 1 ? statusOrder[currentIdx + 1] : null

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span>{order.id}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand/15 text-brand-900 font-sans font-medium">
            Table {order.tableNumber}
          </span>
        </div>
      }
      description={`Received ${formatDateTime(order.createdAt)}`}
    >
      <div className="space-y-6 text-xs">
        {/* Status Tracker & Quick Advance */}
        <div className="bg-canvas/50 p-4 rounded-2xl border border-beige space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-charcoal-muted tracking-wider">
                Current Status
              </p>
              <div className="mt-1">
                <OrderStatusBadge status={order.orderStatus} />
              </div>
            </div>

            {nextStatus && order.orderStatus !== 'Cancelled' && (
              <Button
                variant="primary"
                size="sm"
                disabled={isAdvancing}
                isLoading={isAdvancing}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={async () => {
                  if (isAdvancing) return
                  setIsAdvancing(true)
                  try {
                    const updated = await onUpdateStatus(order.id, nextStatus)
                    if (updated !== false) {
                      toast.success(`Order #${order.orderNumber || order.id} moved to "${nextStatus}"`)
                    }
                  } finally {
                    setIsAdvancing(false)
                  }
                }}
              >
                {nextStatus === 'Accepted' ? 'Accept Order' : `Advance to ${nextStatus}`}
              </Button>
            )}
          </div>

          {/* Stepper progress */}
          {order.orderStatus !== 'Cancelled' && (
            <div className="pt-2">
              <div className="grid grid-cols-6 gap-1">
                {statusOrder.map((step, idx) => {
                  const isDone = currentIdx >= idx
                  const isCurrent = currentIdx === idx
                  return (
                    <div key={step} className="flex flex-col items-center text-center">
                      <div
                        className={`w-full h-1.5 rounded-full mb-1.5 transition-colors ${
                          isDone ? 'bg-brand' : 'bg-beige-dark'
                        }`}
                      />
                      <span
                        className={`text-[9px] truncate max-w-full font-medium ${
                          isCurrent
                            ? 'text-brand font-bold'
                            : isDone
                            ? 'text-charcoal'
                            : 'text-charcoal-muted'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {order.cancelledReason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <strong>Cancellation Reason:</strong> {order.cancelledReason}
            </div>
          )}
        </div>

        {/* Guest Information */}
        <div className="p-4 rounded-2xl border border-beige bg-white space-y-2">
          <h4 className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider">
            Guest Details
          </h4>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 text-charcoal font-medium">
              <User className="w-4 h-4 text-brand" />
              <span>{order.customerName}</span>
            </div>
            {order.customerPhone && (
              <div className="flex items-center gap-2 text-charcoal-muted">
                <Phone className="w-4 h-4 text-brand" />
                <span>{order.customerPhone}</span>
              </div>
            )}
          </div>
          {order.specialInstructions && (
            <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Kitchen Note:</strong> {order.specialInstructions}
              </div>
            </div>
          )}
        </div>

        {/* Itemized Order List */}
        <div className="p-4 rounded-2xl border border-beige bg-white space-y-3">
          <h4 className="text-[11px] font-bold text-charcoal-muted uppercase tracking-wider">
            Ordered Items ({order.items.reduce((s, i) => s + i.quantity, 0)})
          </h4>
          <div className="divide-y divide-beige/60">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-canvas text-charcoal font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {item.quantity}×
                  </span>
                  <div>
                    <p className="font-semibold text-charcoal">{item.name}</p>
                    {item.selectedOptions && (
                      <p className="text-[11px] text-charcoal-muted">
                        {item.selectedOptions.join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-amber-700 italic">"{item.notes}"</p>
                    )}
                  </div>
                </div>
                <span className="font-semibold text-charcoal shrink-0">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-3 border-t border-beige space-y-1.5 text-xs">
            <div className="flex justify-between text-charcoal-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-charcoal-muted">
              <span>Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between text-charcoal-muted">
              <span>Service Charge</span>
              <span>{formatCurrency(order.serviceCharge)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-charcoal pt-2 border-t border-beige">
              <span>Total Amount</span>
              <span className="text-base font-serif text-brand font-bold">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Meta */}
        <div className="p-4 rounded-2xl border border-beige bg-white flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-charcoal-muted tracking-wider">
              Payment ({order.paymentMethod})
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  order.paymentStatus === 'Paid'
                    ? 'bg-emerald-50 text-emerald-800'
                    : order.paymentStatus === 'Refunded'
                    ? 'bg-purple-50 text-purple-800'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>
          {order.paymentStatus !== 'Paid' && order.orderStatus !== 'Cancelled' && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={async () => {
                const updated = await onTogglePayment(order.id)
                if (updated !== false) toast.success(`Order ${order.id} marked as Paid`)
              }}
            >
              Mark Paid
            </Button>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => onPrintClick(order)}
          >
            Print Invoice
          </Button>

          {order.orderStatus !== 'Cancelled' && order.orderStatus !== 'Completed' && (
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              leftIcon={<XCircle className="w-4 h-4" />}
              onClick={() => onCancelClick(order)}
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  )
}

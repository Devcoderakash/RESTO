import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Order } from '../../types'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { useRestaurantStore } from '../../store/useRestaurantStore'
import { Printer, Download, Utensils, CheckCircle2 } from 'lucide-react'

export interface InvoiceModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  const { settings } = useRestaurantStore()

  if (!order) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-6">
        {/* Printable Receipt Container */}
        <div
          id="printable-receipt"
          className="bg-white p-6 rounded-xl border border-beige/80 text-charcoal shadow-xs"
        >
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-beige">
            <h3 className="text-lg font-bold font-serif text-charcoal">
              {settings.profile.name}
            </h3>
            <p className="text-xs text-charcoal-muted mt-0.5">{settings.profile.address}</p>
            <p className="text-xs text-charcoal-muted">Tel: {settings.profile.phone}</p>
            <p className="text-[11px] text-charcoal-muted mt-1 font-mono">
              Tax ID: {settings.billing.taxId}
            </p>
          </div>

          {/* Order Meta Info */}
          <div className="py-3 border-b border-dashed border-beige text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-charcoal-muted">Invoice No:</span>
              <span className="font-mono font-semibold">{settings.billing.invoicePrefix}{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-muted">Table / Zone:</span>
              <span className="font-semibold">Table {order.tableNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-muted">Guest Name:</span>
              <span className="font-semibold">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-muted">Date & Time:</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-muted">Payment:</span>
              <span className="font-semibold uppercase">{order.paymentMethod} • {order.paymentStatus}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-4 border-b border-dashed border-beige">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-charcoal-muted border-b border-beige/40 pb-1">
                  <th className="text-left font-medium pb-2">Item</th>
                  <th className="text-center font-medium pb-2">Qty</th>
                  <th className="text-right font-medium pb-2">Price</th>
                  <th className="text-right font-medium pb-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige/40">
                {order.items.map((item) => (
                  <tr key={item.id} className="py-2">
                    <td className="py-2 text-charcoal font-medium">
                      {item.name}
                      {item.selectedOptions && (
                        <span className="block text-[10px] text-charcoal-muted">
                          {item.selectedOptions.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-center text-charcoal-muted">{item.quantity}</td>
                    <td className="py-2 text-right text-charcoal-muted">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-2 text-right font-semibold text-charcoal">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="py-3 text-xs space-y-1.5 border-b border-dashed border-beige">
            <div className="flex justify-between text-charcoal-muted">
              <span>Subtotal:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Promotional Discount:</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-charcoal-muted">
              <span>Tax ({settings.billing.taxPercentage}%):</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between text-charcoal-muted">
              <span>Service Charge ({settings.billing.serviceChargePercentage}%):</span>
              <span>{formatCurrency(order.serviceCharge)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-charcoal pt-2 border-t border-beige">
              <span>Grand Total:</span>
              <span className="text-base text-brand font-serif font-bold">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-4 text-xs text-charcoal-muted">
            <p className="font-medium text-charcoal">Thank you for dining with us!</p>
            <p className="text-[11px] mt-0.5">Please scan QR on your table to rate your experience.</p>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print Receipt
          </Button>
        </div>
      </div>
    </Modal>
  )
}


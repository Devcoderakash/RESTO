import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { Order } from '../../types'
import { AlertTriangle } from 'lucide-react'

export interface CancelOrderModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (orderId: string, reason: string) => void
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Guest requested cancellation due to schedule change')

  if (!order) return null

  const handleConfirm = () => {
    onConfirm(order.id, reason)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-charcoal">
              Cancel Order {order.id}?
            </h4>
            <p className="text-xs text-charcoal-muted mt-1">
              Table {order.tableNumber} • {order.customerName}
            </p>
          </div>
        </div>

        <p className="text-xs text-charcoal-muted leading-relaxed">
          Cancelling this order will stop kitchen prep and void the pending ticket. If payment has already been captured, it will be marked for refund.
        </p>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-soft mb-1.5">
            Cancellation Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full bg-white text-charcoal text-xs rounded-xl border border-beige p-3 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            placeholder="Specify reason for cancelling this order..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-beige">
          <Button variant="outline" size="sm" onClick={onClose}>
            Keep Order
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirm}>
            Confirm Cancellation
          </Button>
        </div>
      </div>
    </Modal>
  )
}


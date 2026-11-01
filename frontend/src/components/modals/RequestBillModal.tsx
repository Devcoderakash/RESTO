import React, { useState } from 'react'
import { Receipt, CreditCard, Banknote, QrCode, CheckCircle2 } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { useTableStore } from '../../store/tableStore'
import { useCartStore } from '../../store/cartStore'
import { formatCurrency } from '../../lib/formatters'
import { toast } from 'sonner'
import { createServiceRequest } from '../../services/api'

interface RequestBillModalProps {
  isOpen: boolean
  onClose: () => void
}

export const RequestBillModal: React.FC<RequestBillModalProps> = ({ isOpen, onClose }) => {
  const { currentTable } = useTableStore()
  const { getBreakdown, items } = useCartStore()
  const [paymentPreference, setPaymentPreference] = useState<'card' | 'cash' | 'upi'>('upi')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cartBreakdown = getBreakdown()
  const estimatedAmount = cartBreakdown.finalTotal

  const handleConfirm = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await createServiceRequest({
        tableNumber: currentTable,
        type: 'request_bill',
        paymentPreference: paymentPreference.toUpperCase(),
      })
      toast.success(`Bill requested for Table ${currentTable}!`, {
        description: `Server will prepare the bill with ${paymentPreference.toUpperCase()} payment preference.`,
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      })
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request the bill. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Request Table Bill"
      description={`Table ${currentTable} • Review estimated bill & payment method.`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Table & Total Card */}
        <div className="p-4 rounded-2xl bg-cream-100 border border-beige flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-charcoal-600">Dining Location</div>
            <div className="text-lg font-serif font-bold text-charcoal">Table {currentTable}</div>
            <div className="text-xs text-charcoal-600 mt-0.5">
              {items.length > 0
                ? `${items.length} items in cart`
                : 'Table Dining Session'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-charcoal-600">Estimated Total</div>
            <div className="text-2xl font-serif font-bold text-gold-700">
              {formatCurrency(estimatedAmount)}
            </div>
            <div className="text-[11px] text-charcoal-600">
              {items.length > 0 ? 'Cart estimate; server confirms final bill' : 'Final amount calculated by the restaurant'}
            </div>
          </div>
        </div>

        {/* Payment preference */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600 mb-2 block">
            Preferred Payment Method at Table
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentPreference('upi')}
              className={`p-3 rounded-xl border text-center transition-all ${
                paymentPreference === 'upi'
                  ? 'border-gold bg-gold-50/80 text-gold-800 font-semibold shadow-sm ring-1 ring-gold'
                  : 'border-beige hover:border-gold/40 bg-white text-charcoal'
              }`}
            >
              <QrCode className="w-5 h-5 mx-auto mb-1 text-gold-700" />
              <div className="text-xs">UPI / QR</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentPreference('card')}
              className={`p-3 rounded-xl border text-center transition-all ${
                paymentPreference === 'card'
                  ? 'border-gold bg-gold-50/80 text-gold-800 font-semibold shadow-sm ring-1 ring-gold'
                  : 'border-beige hover:border-gold/40 bg-white text-charcoal'
              }`}
            >
              <CreditCard className="w-5 h-5 mx-auto mb-1 text-gold-700" />
              <div className="text-xs">Card Tap/Chip</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentPreference('cash')}
              className={`p-3 rounded-xl border text-center transition-all ${
                paymentPreference === 'cash'
                  ? 'border-gold bg-gold-50/80 text-gold-800 font-semibold shadow-sm ring-1 ring-gold'
                  : 'border-beige hover:border-gold/40 bg-white text-charcoal'
              }`}
            >
              <Banknote className="w-5 h-5 mx-auto mb-1 text-gold-700" />
              <div className="text-xs">Cash</div>
            </button>
          </div>
        </div>

        <p className="text-xs text-charcoal-600">
          Your dining steward will bring the printed receipt folder and portable card/UPI machine to Table {currentTable}.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="md" onClick={onClose}>
            Continue Dining
          </Button>
          <Button
            variant="gold"
            size="md"
            isLoading={isSubmitting}
            onClick={handleConfirm}
            className="min-w-[150px]"
          >
            <Receipt className="w-4 h-4 mr-1.5" />
            Send Bill Request
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

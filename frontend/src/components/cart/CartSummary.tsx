import React from 'react'
import { BillBreakdown } from '../../types/cart'
import { formatCurrency } from '../../lib/formatters'

interface CartSummaryProps {
  breakdown: BillBreakdown
  className?: string
}

export const CartSummary: React.FC<CartSummaryProps> = ({ breakdown, className }) => {
  return (
    <div className={`space-y-2 text-xs sm:text-sm ${className || ''}`}>
      <div className="flex justify-between text-charcoal-600">
        <span>Item Subtotal</span>
        <span className="font-semibold text-charcoal">{formatCurrency(breakdown.subtotal)}</span>
      </div>

      <div className="flex justify-between text-charcoal-600">
        <span className="flex items-center gap-1">
          <span>GST (5%)</span>
          <span className="text-[10px] text-charcoal-600/70">(2.5% CGST + 2.5% SGST)</span>
        </span>
        <span className="font-medium text-charcoal">{formatCurrency(breakdown.gstTotal)}</span>
      </div>

      {breakdown.serviceCharge > 0 && (
        <div className="flex justify-between text-charcoal-600">
          <span>Service Charge</span>
          <span className="font-medium text-charcoal">{formatCurrency(breakdown.serviceCharge)}</span>
        </div>
      )}

      <div className="pt-2.5 border-t border-dashed border-beige flex justify-between items-baseline">
        <div>
          <span className="font-serif font-bold text-sm sm:text-base text-charcoal block">Total Amount</span>
          <span className="text-[10px] text-charcoal-600 font-normal">Inclusive of all government taxes</span>
        </div>
        <span className="font-serif font-bold text-lg sm:text-xl text-charcoal">
          {formatCurrency(breakdown.finalTotal)}
        </span>
      </div>
    </div>
  )
}

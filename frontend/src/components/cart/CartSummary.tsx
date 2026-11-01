import React from 'react'
import { BillBreakdown } from '../../types/cart'
import { formatCurrency } from '../../lib/formatters'

interface CartSummaryProps {
  breakdown: BillBreakdown
  className?: string
}

export const CartSummary: React.FC<CartSummaryProps> = ({ breakdown, className }) => {
  return (
    <div className={`space-y-2.5 text-sm ${className || ''}`}>
      <div className="flex justify-between text-charcoal-600">
        <span>Item Subtotal</span>
        <span className="font-medium text-charcoal">{formatCurrency(breakdown.subtotal)}</span>
      </div>

      <div className="flex justify-between text-charcoal-600 text-xs">
        <span className="flex items-center gap-1">
          <span>GST (5%)</span>
          <span className="text-[10px] text-charcoal-600/80">(2.5% CGST + 2.5% SGST)</span>
        </span>
        <span>{formatCurrency(breakdown.gstTotal)}</span>
      </div>

      <div className="flex justify-between text-charcoal-600 text-xs">
        <span className="flex items-center gap-1">
          <span>Restaurant Service Charge (5%)</span>
        </span>
        <span>{formatCurrency(breakdown.serviceCharge)}</span>
      </div>

      <div className="pt-2 border-t border-dashed border-beige flex justify-between items-baseline">
        <div>
          <span className="font-serif font-bold text-base text-charcoal">To Pay</span>
          <span className="block text-[10px] text-charcoal-600">All inclusive of taxes & service</span>
        </div>
        <span className="font-serif font-bold text-xl text-gold-700">
          {formatCurrency(breakdown.finalTotal)}
        </span>
      </div>
    </div>
  )
}

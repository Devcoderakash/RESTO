import React from 'react'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { formatCurrency } from '../../lib/formatters'

export const MobileCartBar: React.FC = () => {
  const { items, getTotalCount, getBreakdown, openDrawer } = useCartStore()

  if (items.length === 0) return null

  const count = getTotalCount()
  const breakdown = getBreakdown()

  return (
    <aside
      aria-label="Mobile order summary bar"
      style={{ bottom: 'max(14px, calc(env(safe-area-inset-bottom, 0px) + 12px))' }}
      className="fixed left-3.5 right-3.5 z-40 md:hidden animate-in slide-in-from-bottom-4 duration-300 max-w-lg mx-auto"
    >
      <button
        type="button"
        onClick={openDrawer}
        className="w-full bg-charcoal text-white p-3 sm:p-3.5 rounded-2xl shadow-elevated border border-gold/40 flex items-center justify-between hover:bg-black transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gold text-charcoal flex items-center justify-center font-bold shrink-0 shadow-xs">
            <ShoppingBag className="w-5 h-5 text-charcoal stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-charcoal text-[10px] font-bold text-gold flex items-center justify-center border border-gold">
              {count}
            </span>
          </div>

          <div className="text-left">
            <div className="text-[11px] text-cream-300 font-medium">
              {count} {count === 1 ? 'dish' : 'dishes'} in order
            </div>
            <div className="font-serif font-black text-base text-gold leading-tight">
              {formatCurrency(breakdown.finalTotal)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold bg-gold text-charcoal px-3.5 py-2 rounded-xl shadow-xs">
          <span>Review Order</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </button>
    </aside>
  )
}

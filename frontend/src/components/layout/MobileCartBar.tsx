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
    <aside aria-label="Mobile order summary" className="fixed bottom-4 left-4 right-4 z-40 md:hidden animate-in slide-in-from-bottom duration-300">
      <button
        onClick={openDrawer}
        className="w-full bg-charcoal text-cream-100 p-3.5 rounded-2xl shadow-elevated border border-gold/40 flex items-center justify-between hover:bg-charcoal-800 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gold text-white flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-charcoal text-[11px] font-bold text-cream-100 flex items-center justify-center border border-gold">
              {count}
            </span>
          </div>
          <div className="text-left">
            <div className="text-xs text-cream-300 font-medium">
              {count} {count === 1 ? 'item' : 'items'} in table order
            </div>
            <div className="font-serif font-bold text-base text-gold-300">
              {formatCurrency(breakdown.finalTotal)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold bg-gold text-white px-3.5 py-2 rounded-xl shadow-sm">
          <span>View Cart</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </button>
    </aside>
  )
}

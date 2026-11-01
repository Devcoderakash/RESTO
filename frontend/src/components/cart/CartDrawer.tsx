import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingBag, ArrowRight, UtensilsCrossed, Trash2 } from 'lucide-react'
import { CartItem } from './CartItem'
import { CartSummary } from './CartSummary'
import { useCartStore } from '../../store/cartStore'
import { useTableStore } from '../../store/tableStore'
import { formatCurrency } from '../../lib/formatters'

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate()
  const { isDrawerOpen, closeDrawer, items, clearCart, getBreakdown, getTotalCount } = useCartStore()
  const { currentTable } = useTableStore()

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isDrawerOpen])

  if (!isDrawerOpen) return null

  const breakdown = getBreakdown()
  const totalCount = getTotalCount()

  const handleProceedToCheckout = () => {
    closeDrawer()
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-elevated z-10 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-beige flex items-center justify-between bg-canvas/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-charcoal text-gold flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-charcoal">Your Table Cart</h3>
              <p className="text-[11px] text-charcoal-600 font-medium">
                Table {currentTable || '01'} • {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="p-1.5 text-charcoal-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs flex items-center gap-1 transition-colors"
                title="Clear all items from cart"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={closeDrawer}
              className="p-1.5 text-charcoal-600 hover:text-charcoal hover:bg-cream-200 rounded-full transition-colors ml-1"
              aria-label="Close cart drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Items Container */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-cream-100 border border-beige flex items-center justify-center text-charcoal-600/60 mx-auto">
                <UtensilsCrossed className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div className="max-w-xs space-y-1">
                <h4 className="font-serif text-lg font-bold text-charcoal">Your cart is empty</h4>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Browse dishes on the digital menu to build your table order.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="mt-2 px-5 py-2.5 rounded-xl bg-charcoal text-white hover:bg-emerald text-xs font-semibold transition-colors"
              >
                Explore Menu
              </button>
            </div>
          ) : (
            <div className="divide-y divide-beige/70">
              {items.map((item) => (
                <CartItem key={item.cartItemId} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-beige bg-canvas/80 backdrop-blur-md space-y-3.5 shrink-0 safe-bottom">
            <CartSummary breakdown={breakdown} />

            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 px-4 rounded-xl bg-charcoal hover:bg-emerald text-white text-xs sm:text-sm font-semibold flex items-center justify-between transition-all duration-200 shadow-sm active:scale-[0.98]"
            >
              <span>Proceed to Checkout</span>
              <span className="flex items-center gap-1 font-serif text-gold font-bold text-sm sm:text-base">
                <span>{formatCurrency(breakdown.finalTotal)}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

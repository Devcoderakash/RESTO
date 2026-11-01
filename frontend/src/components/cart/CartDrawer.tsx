import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingBag, ArrowRight, Utensils, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { CartItem } from './CartItem'
import { CartSummary } from './CartSummary'
import { useCartStore } from '../../store/cartStore'
import { useTableStore } from '../../store/tableStore'
import { formatCurrency } from '../../lib/formatters'

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate()
  const { isDrawerOpen, closeDrawer, items, clearCart, getBreakdown, getTotalCount } = useCartStore()
  const { currentTable } = useTableStore()

  // Lock body scroll when drawer is open
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-elevated z-10 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-beige flex items-center justify-between bg-cream-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-charcoal">My Cart</h3>
              <p className="text-xs text-charcoal-600">
                Table {currentTable} • {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="p-2 text-charcoal-600 hover:text-nonveg hover:bg-rose-50 rounded-lg text-xs flex items-center gap-1 transition-colors"
                title="Clear entire cart"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={closeDrawer}
              className="p-2 text-charcoal-600 hover:text-charcoal hover:bg-cream-200/80 rounded-full transition-colors ml-1"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-20 h-20 rounded-full bg-cream-100 border border-beige flex items-center justify-center text-charcoal-600/70">
                <Utensils className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="max-w-xs space-y-1">
                <h4 className="font-serif text-xl font-bold text-charcoal">Your cart is empty</h4>
                <p className="text-xs sm:text-sm text-charcoal-600">
                  Select dishes from our wood-fired menu to begin your table order at Table {currentTable}.
                </p>
              </div>
              <Button variant="gold" size="md" onClick={closeDrawer} className="mt-2">
                Explore Menu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-gold-50/50 border border-gold-200/60 text-xs text-charcoal flex items-center justify-between">
                <span>Direct Table Delivery to:</span>
                <span className="font-bold text-gold-800 tracking-wider">TABLE {currentTable}</span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-beige-light">
                {items.map((item) => (
                  <CartItem key={item.cartItemId} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Summary and Checkout button */}
        {items.length > 0 && (
          <div className="p-6 border-t border-beige bg-cream-50/60 space-y-4">
            <CartSummary breakdown={breakdown} />

            <div className="space-y-2 pt-2">
              <Button
                variant="gold"
                size="lg"
                className="w-full justify-between shadow-gold-glow"
                onClick={handleProceedToCheckout}
              >
                <span>Proceed to Checkout</span>
                <span className="flex items-center gap-1.5 font-serif font-bold text-lg">
                  {formatCurrency(breakdown.finalTotal)}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-charcoal-600"
                onClick={closeDrawer}
              >
                Continue Browsing Menu
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

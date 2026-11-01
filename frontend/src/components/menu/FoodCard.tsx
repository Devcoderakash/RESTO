import React from 'react'
import { Plus, Minus, AlertCircle } from 'lucide-react'
import { FoodItem } from '../../types/menu'
import { DietaryBadge } from './DietaryBadge'
import { formatCurrency } from '../../lib/formatters'
import { useCartStore } from '../../store/cartStore'
import { cn } from '../../lib/utils'

interface FoodCardProps {
  foodItem: FoodItem
  onSelect: (item: FoodItem) => void
  featured?: boolean
}

export const FoodCard: React.FC<FoodCardProps> = ({ foodItem, onSelect, featured = false }) => {
  const { items, addItem, updateQuantity, removeItem } = useCartStore()
  const hasCustomizations = Boolean(foodItem.customizationGroups && foodItem.customizationGroups.length > 0)

  // Find if this simple foodItem is currently in cart
  const cartEntries = items.filter((ci) => ci.foodItem.id === foodItem.id)
  const totalInCart = cartEntries.reduce((sum, ci) => sum + ci.quantity, 0)
  const isSimpleInCart = !hasCustomizations && cartEntries.length === 1

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasCustomizations) {
      onSelect(foodItem)
    } else {
      addItem(foodItem, [], 1)
    }
  }

  const handleQuickDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSimpleInCart) return
    const entry = cartEntries[0]
    if (entry.quantity > 1) {
      updateQuantity(entry.cartItemId, entry.quantity - 1)
    } else {
      removeItem(entry.cartItemId)
    }
  }

  const handleQuickIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isSimpleInCart) {
      onSelect(foodItem)
      return
    }
    const entry = cartEntries[0]
    updateQuantity(entry.cartItemId, entry.quantity + 1)
  }

  return (
    <article
      onClick={() => onSelect(foodItem)}
      role="button"
      tabIndex={0}
      className={cn(
        'group relative bg-white rounded-2xl border border-beige/80 overflow-hidden shadow-soft hover:shadow-medium hover:border-gold-300 transition-all duration-200 flex flex-col cursor-pointer text-left',
        !foodItem.isAvailable && 'opacity-65 bg-cream-50/70',
        featured && 'ring-1 ring-gold/30'
      )}
    >
      {/* Food Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-cream-200">
        <img
          src={foodItem.image}
          alt={foodItem.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Veg / Non-veg indicator badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="p-1 rounded-lg bg-white/95 backdrop-blur-md shadow-xs block">
            <DietaryBadge isVeg={foodItem.isVegetarian} size="sm" />
          </span>
        </div>

        {/* Out of Stock Notice */}
        {!foodItem.isAvailable && (
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-[2px] flex items-center justify-center p-3">
            <span className="px-3 py-1 rounded-full bg-white text-charcoal font-semibold text-xs shadow-md flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-sm sm:text-base text-charcoal leading-snug group-hover:text-gold-700 transition-colors line-clamp-1">
            {foodItem.name}
          </h3>

          <p className="text-[11px] sm:text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
            {foodItem.description}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2 border-t border-beige/60 flex items-center justify-between gap-2">
          <div>
            <span className="font-serif font-bold text-sm sm:text-base text-charcoal">
              {formatCurrency(foodItem.price)}
            </span>
            {hasCustomizations && (
              <span className="block text-[10px] text-charcoal-600 font-medium">Customisable</span>
            )}
          </div>

          <div>
            {!foodItem.isAvailable ? (
              <span className="text-[11px] text-charcoal-600 italic">Unavailable</span>
            ) : isSimpleInCart && totalInCart > 0 ? (
              <div
                className="flex items-center rounded-xl bg-charcoal text-white text-xs font-bold overflow-hidden shadow-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleQuickDecrement}
                  className="px-2.5 py-1.5 hover:bg-emerald transition-colors active:scale-95"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3 text-gold" />
                </button>
                <span className="px-1.5 text-[11px] font-bold min-w-[18px] text-center">
                  {totalInCart}
                </span>
                <button
                  type="button"
                  onClick={handleQuickIncrement}
                  className="px-2.5 py-1.5 hover:bg-emerald transition-colors active:scale-95"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3 text-gold" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="px-3 py-1.5 rounded-xl bg-cream-50 hover:bg-charcoal text-charcoal hover:text-white border border-beige hover:border-charcoal text-xs font-semibold flex items-center gap-1 transition-all duration-200 active:scale-95 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-gold-700" />
                <span>{hasCustomizations ? 'Customise' : 'Add'}</span>
                {totalInCart > 0 && (
                  <span className="w-4 h-4 rounded-full bg-gold text-charcoal text-[10px] font-bold flex items-center justify-center ml-0.5">
                    {totalInCart}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

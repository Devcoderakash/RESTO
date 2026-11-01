import React from 'react'
import { Plus, Sparkles, Clock, AlertCircle } from 'lucide-react'
import { FoodItem } from '../../types/menu'
import { DietaryBadge } from './DietaryBadge'
import { formatCurrency } from '../../lib/formatters'
import { cn } from '../../lib/utils'

interface FoodCardProps {
  foodItem: FoodItem
  onSelect: (item: FoodItem) => void
  featured?: boolean
}

export const FoodCard: React.FC<FoodCardProps> = ({ foodItem, onSelect, featured = false }) => {
  const hasCustomizations = foodItem.customizationGroups && foodItem.customizationGroups.length > 0

  return (
    <article
      onClick={() => onSelect(foodItem)}
      role="button"
      tabIndex={0}
      className={cn(
        'group relative bg-white rounded-2xl sm:rounded-3xl border border-beige/90 overflow-hidden shadow-soft hover:shadow-medium hover:border-gold/40 transition-all duration-300 flex flex-col cursor-pointer text-left',
        !foodItem.isAvailable && 'opacity-70 bg-cream-50/70',
        featured && 'border-gold/30'
      )}
    >
      {/* Food Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-cream-200">
        <img
          src={foodItem.image}
          alt={foodItem.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Veg / Non-veg dot indicator */}
        <div className="absolute top-2.5 left-2.5">
          <span className="p-1.5 rounded-lg bg-white/95 backdrop-blur-md shadow-sm block">
            <DietaryBadge isVeg={foodItem.isVegetarian} size="sm" />
          </span>
        </div>

        {/* Out of Stock Overlay */}
        {!foodItem.isAvailable && (
          <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-[2px] flex items-center justify-center p-3">
            <span className="px-3 py-1 rounded-full bg-white text-charcoal font-semibold text-xs shadow-md flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Food Details Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif font-bold text-base sm:text-lg text-charcoal leading-snug group-hover:text-gold-700 transition-colors">
              {foodItem.name}
            </h3>
          </div>

          <p className="text-xs sm:text-sm text-charcoal-600 line-clamp-2 leading-relaxed">
            {foodItem.description}
          </p>
        </div>

        {/* Price & Add Action Row */}
        <div className="pt-2 border-t border-beige-light flex items-center justify-between gap-3">
          <div>
            <span className="font-serif font-bold text-base sm:text-lg text-charcoal group-hover:text-gold-700 transition-colors">
              {formatCurrency(foodItem.price)}
            </span>
            {hasCustomizations && (
              <span className="block text-[10px] text-charcoal-600">Customisable</span>
            )}
          </div>

          <div>
            {foodItem.isAvailable ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(foodItem)
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gold-50 hover:bg-gold text-gold-800 hover:text-white border border-gold-200/90 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs group-hover:bg-gold group-hover:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{hasCustomizations ? 'Customise' : 'Add'}</span>
              </button>
            ) : (
              <span className="text-xs text-charcoal-600 italic">Unavailable</span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

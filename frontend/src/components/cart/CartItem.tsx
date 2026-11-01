import React, { useState } from 'react'
import { Plus, Minus, Trash2, Edit3, Check } from 'lucide-react'
import { CartItem as CartItemType } from '../../types/cart'
import { DietaryBadge } from '../menu/DietaryBadge'
import { formatCurrency } from '../../lib/formatters'
import { useCartStore } from '../../store/cartStore'

interface CartItemProps {
  item: CartItemType
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateQuantity, removeItem, updateItemInstructions } = useCartStore()
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(item.specialInstructions || '')

  const handleSaveNote = () => {
    updateItemInstructions(item.cartItemId, noteText)
    setIsEditingNote(false)
  }

  return (
    <div className="py-4 border-b border-beige-light first:pt-0 last:border-b-0 space-y-2.5">
      <div className="flex gap-3">
        {/* Food thumbnail */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-cream-200 shrink-0 relative">
          <img
            src={item.foodItem.image}
            alt={item.foodItem.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info & Price */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <DietaryBadge isVeg={item.foodItem.isVegetarian} size="sm" />
                <h4 className="font-serif font-bold text-sm sm:text-base text-charcoal leading-snug truncate">
                  {item.foodItem.name}
                </h4>
              </div>

              {/* Customizations tags */}
              {item.selectedCustomizations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.selectedCustomizations.map((c, i) => (
                    <span
                      key={i}
                      className="text-[11px] text-charcoal-600 bg-cream-100 px-1.5 py-0.5 rounded border border-beige/60"
                    >
                      {c.optionName}
                      {c.price > 0 && ` (+${formatCurrency(c.price)})`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Line total */}
            <div className="text-right shrink-0">
              <div className="font-serif font-bold text-sm sm:text-base text-gold-700">
                {formatCurrency(item.lineTotal)}
              </div>
              <div className="text-[10px] text-charcoal-600">
                {item.quantity} × {formatCurrency(item.unitPriceWithCustomizations)}
              </div>
            </div>
          </div>

          {/* Quantity Controls & Remove */}
          <div className="flex items-center justify-between mt-3 pt-1">
            {/* Note prompt */}
            <button
              onClick={() => setIsEditingNote(!isEditingNote)}
              className="text-[11px] text-charcoal-600 hover:text-charcoal flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              <span>{item.specialInstructions ? 'Edit instruction' : 'Add special note'}</span>
            </button>

            {/* Quantity Stepper */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-cream-100 border border-beige p-0.5">
                <button
                  onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                  className="w-6 h-6 rounded flex items-center justify-center text-charcoal-600 hover:text-charcoal hover:bg-white transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold text-charcoal">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                  className="w-6 h-6 rounded flex items-center justify-center text-charcoal-600 hover:text-charcoal hover:bg-white transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Remove item */}
              <button
                onClick={() => removeItem(item.cartItemId)}
                className="p-1.5 text-charcoal-600 hover:text-nonveg hover:bg-rose-50 rounded-lg transition-colors"
                title="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Special instructions display / edit */}
      {isEditingNote ? (
        <div className="flex gap-2 pt-1 pl-1">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Extra spicy, dressing separate..."
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-beige bg-white text-charcoal focus:outline-none focus:ring-1 focus:ring-gold"
          />
          <button
            onClick={handleSaveNote}
            className="px-2.5 py-1.5 rounded-lg bg-charcoal text-white text-xs hover:bg-charcoal-800 flex items-center gap-1"
          >
            <Check className="w-3 h-3" /> Save
          </button>
        </div>
      ) : (
        item.specialInstructions && (
          <div className="text-[11px] text-charcoal-600 italic bg-cream-50 px-2 py-1 rounded border border-beige-light">
            Note: "{item.specialInstructions}"
          </div>
        )
      )}
    </div>
  )
}

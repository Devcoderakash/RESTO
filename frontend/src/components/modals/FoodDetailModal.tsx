import React, { useState, useEffect } from 'react'
import { Plus, Minus, Clock, Flame, Sparkles, ShoppingBag, Check } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { DietaryBadge } from '../menu/DietaryBadge'
import { FoodItem, CustomizationGroup, CustomizationOption } from '../../types/menu'
import { SelectedCustomization } from '../../types/cart'
import { useCartStore } from '../../store/cartStore'
import { formatCurrency } from '../../lib/formatters'
import { toast } from 'sonner'

interface FoodDetailModalProps {
  foodItem: FoodItem | null
  isOpen: boolean
  onClose: () => void
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({
  foodItem,
  isOpen,
  onClose,
}) => {
  const { addItem, openDrawer } = useCartStore()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, CustomizationOption[]>>({})
  const [specialInstructions, setSpecialInstructions] = useState('')

  // Initialize default customizations when foodItem changes
  useEffect(() => {
    if (foodItem && foodItem.customizationGroups) {
      const defaults: Record<string, CustomizationOption[]> = {}
      foodItem.customizationGroups.forEach((group) => {
        const defaultOpts = group.options.filter((o) => o.isDefault)
        if (defaultOpts.length > 0) {
          defaults[group.id] = defaultOpts
        } else if (group.required && group.options.length > 0) {
          defaults[group.id] = [group.options[0]]
        } else {
          defaults[group.id] = []
        }
      })
      setSelectedOptions(defaults)
    } else {
      setSelectedOptions({})
    }
    setQuantity(1)
    setSpecialInstructions('')
  }, [foodItem])

  if (!foodItem) return null

  // Single-select choice handler
  const handleSingleSelect = (group: CustomizationGroup, option: CustomizationOption) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [group.id]: [option],
    }))
  }

  // Multi-select choice handler
  const handleMultiSelect = (group: CustomizationGroup, option: CustomizationOption) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] || []
      const exists = current.some((o) => o.id === option.id)
      let updated: CustomizationOption[]

      if (exists) {
        updated = current.filter((o) => o.id !== option.id)
      } else {
        if (group.maxSelections && current.length >= group.maxSelections) {
          toast.info(`Maximum ${group.maxSelections} options allowed for ${group.name}`)
          return prev
        }
        updated = [...current, option]
      }

      return {
        ...prev,
        [group.id]: updated,
      }
    })
  }

  // Calculate dynamic unit price
  const customizationsList: SelectedCustomization[] = Object.entries(selectedOptions).flatMap(
    ([groupId, opts]) => {
      const group = foodItem.customizationGroups?.find((g) => g.id === groupId)
      return opts.map((opt) => ({
        groupId,
        groupName: group?.name || 'Customization',
        optionId: opt.id,
        optionName: opt.name,
        price: opt.price,
      }))
    }
  )

  const extrasTotal = customizationsList.reduce((acc, c) => acc + c.price, 0)
  const unitPrice = foodItem.price + extrasTotal
  const finalTotal = unitPrice * quantity

  const handleAddToCart = () => {
    addItem(foodItem, customizationsList, quantity, specialInstructions)
    toast.success(`Added ${quantity}x "${foodItem.name}" to cart`, {
      action: {
        label: 'View Cart',
        onClick: () => openDrawer(),
      },
    })
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="lg" showClose={true}>
      <div className="space-y-6">
        {/* Hero image with dietary badge and status */}
        <div className="relative -mx-6 -mt-5 h-56 sm:h-72 overflow-hidden bg-charcoal-100">
          <img
            src={foodItem.image}
            alt={foodItem.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-black/20" />

          {/* Badges on image */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/90 backdrop-blur-md shadow-md">
              <DietaryBadge isVeg={foodItem.isVegetarian} size="md" />
            </span>
            {foodItem.isChefSpecial && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gold text-white shadow-sm flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Chef’s Special
              </span>
            )}
            {foodItem.isPopular && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 text-charcoal backdrop-blur-md shadow-sm">
                Bestseller
              </span>
            )}
          </div>

          {/* Quick info over gradient */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between text-white">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md">
                {foodItem.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-cream-200 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gold-300" />
                  {foodItem.preparationTime}
                </span>
                {foodItem.calories && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    {foodItem.calories}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed">
          {foodItem.description}
        </p>

        {/* Customization Groups */}
        {foodItem.customizationGroups && foodItem.customizationGroups.length > 0 && (
          <div className="space-y-5 divide-y divide-beige-light pt-2">
            {foodItem.customizationGroups.map((group) => {
              const selectedInGroup = selectedOptions[group.id] || []

              return (
                <div key={group.id} className="pt-4 first:pt-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif font-bold text-charcoal text-base">
                        {group.name}
                      </span>
                      {group.maxSelections && (
                        <span className="text-xs text-charcoal-600 ml-2">
                          (Choose up to {group.maxSelections})
                        </span>
                      )}
                    </div>
                    {group.required ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-700 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                        Required
                      </span>
                    ) : (
                      <span className="text-[11px] uppercase tracking-wider text-charcoal-600">
                        Optional
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.options.map((opt) => {
                      const isSelected = selectedInGroup.some((o) => o.id === opt.id)
                      const isSingle = group.type === 'single'

                      return (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() =>
                            isSingle
                              ? handleSingleSelect(group, opt)
                              : handleMultiSelect(group, opt)
                          }
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                            isSelected
                              ? 'border-gold bg-gold-50/70 text-charcoal font-medium ring-1 ring-gold shadow-sm'
                              : 'border-beige hover:border-gold/40 bg-white text-charcoal hover:bg-cream-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-4 h-4 flex items-center justify-center border transition-colors ${
                                isSingle ? 'rounded-full' : 'rounded-md'
                              } ${
                                isSelected
                                  ? 'border-gold bg-gold text-white'
                                  : 'border-charcoal-200 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <span className="text-left text-xs sm:text-sm">{opt.name}</span>
                          </div>

                          {opt.price > 0 ? (
                            <span className="text-xs font-semibold text-gold-700 shrink-0 ml-2">
                              +{formatCurrency(opt.price)}
                            </span>
                          ) : (
                            <span className="text-xs text-charcoal-600 shrink-0 ml-2">Free</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Special Cooking Instructions */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
            Special Instructions / Dietary Allergies
          </label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="e.g. Extra hot honey on the side, no fresh cilantro, separate dressing..."
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-beige bg-cream-50/40 text-charcoal text-sm placeholder:text-charcoal-600/50 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:bg-white resize-none"
          />
        </div>

        {/* Footer with Quantity Counter & Add to Cart */}
        <div className="pt-4 border-t border-beige flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Quantity selector */}
          <div className="flex items-center justify-between w-full sm:w-auto p-1 rounded-xl bg-cream-200/70 border border-beige-dark gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 rounded-lg bg-white text-charcoal hover:bg-cream-100 disabled:opacity-40 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-base text-charcoal">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-9 h-9 rounded-lg bg-white text-charcoal hover:bg-cream-100 flex items-center justify-center transition-colors shadow-sm"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart button */}
          <Button
            variant="gold"
            size="lg"
            className="w-full sm:w-auto sm:flex-1 justify-between shadow-gold-glow"
            onClick={handleAddToCart}
            disabled={!foodItem.isAvailable}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>{foodItem.isAvailable ? 'Add to Order' : 'Currently Unavailable'}</span>
            </span>
            <span className="font-serif font-bold text-lg">
              {formatCurrency(finalTotal)}
            </span>
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

import React from 'react'
import { Utensils, RotateCcw } from 'lucide-react'
import { FoodItem, CategoryId } from '../../types/menu'
import { FoodCard } from './FoodCard'
import { Button } from '../ui/Button'
import { MenuCategory } from '../../types/menu'

interface FoodGridProps {
  items: FoodItem[]
  activeCategory: CategoryId
  searchQuery: string
  onSelectItem: (item: FoodItem) => void
  onResetFilters: () => void
  categories: MenuCategory[]
}

export const FoodGrid: React.FC<FoodGridProps> = ({
  items,
  activeCategory,
  searchQuery,
  onSelectItem,
  onResetFilters,
  categories,
}) => {
  const isSearching = searchQuery.trim().length > 0

  if (items.length === 0) {
    return (
      <div className="py-14 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-cream-100 border border-beige flex items-center justify-center text-charcoal-600 mx-auto">
          <Utensils className="w-7 h-7 stroke-[1.5] text-gold-700" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-lg text-charcoal">No dishes found</h3>
          <p className="text-xs text-charcoal-600 leading-relaxed">
            We couldn't find any dishes matching your filters or search terms.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onResetFilters}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset All Filters
        </Button>
      </div>
    )
  }

  const currentCategoryObj = categories.find((c) => c.id === activeCategory)

  return (
    <div className="py-4">
      <section className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-beige/80 pb-2">
          <div>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-charcoal tracking-tight">
              {isSearching ? `Search results for "${searchQuery}"` : currentCategoryObj?.name || 'All Items'}
            </h2>
          </div>
          <span className="text-xs text-charcoal-600 font-medium">
            {items.length} {items.length === 1 ? 'dish' : 'dishes'}
          </span>
        </div>

        {/* Responsive Grid: Horizontal cards on mobile (grid-cols-1), Multi-column on tablet/desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {items.map((item) => (
            <FoodCard key={item.id} foodItem={item} onSelect={onSelectItem} />
          ))}
        </div>
      </section>
    </div>
  )
}

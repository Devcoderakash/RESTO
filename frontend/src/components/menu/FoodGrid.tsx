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
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-cream-100 border border-beige flex items-center justify-center text-charcoal-600 mx-auto">
          <Utensils className="w-7 h-7 stroke-[1.5]" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-xl text-charcoal">No dishes found</h3>
          <p className="text-sm text-charcoal-600 mt-1">
            Try adjusting your search terms or select another category.
          </p>
        </div>
        <Button variant="outline" size="md" onClick={onResetFilters}>
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Reset Search
        </Button>
      </div>
    )
  }

  const currentCategoryObj = categories.find((c) => c.id === activeCategory)

  return (
    <div className="py-6">
      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-beige pb-3">
          <div>
            <h2 className="font-serif font-bold text-2xl text-charcoal">
              {isSearching ? `Search: "${searchQuery}"` : currentCategoryObj?.name || 'All Items'}
            </h2>
          </div>
          <span className="text-xs text-charcoal-600">
            {items.length} {items.length === 1 ? 'dish' : 'dishes'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <FoodCard key={item.id} foodItem={item} onSelect={onSelectItem} />
          ))}
        </div>
      </section>
    </div>
  )
}

import React from 'react'
import {
  UtensilsCrossed,
  Flame,
  CookingPot,
  Pizza,
  GlassWater,
  Cake,
  Leaf,
} from 'lucide-react'
import { CategoryId, MenuCategory } from '../../types/menu'
import { cn } from '../../lib/utils'

interface CategoryNavigationProps {
  activeCategory: CategoryId
  onSelectCategory: (id: CategoryId) => void
  dietaryFilter: 'all' | 'veg' | 'non-veg'
  onSelectDietaryFilter: (filter: 'all' | 'veg' | 'non-veg') => void
  showChefSpecialsOnly: boolean
  onToggleChefSpecials: () => void
  categoryCounts: Record<CategoryId, number>
  categories: MenuCategory[]
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  activeCategory,
  onSelectCategory,
  dietaryFilter,
  onSelectDietaryFilter,
  categories,
}) => {
  const getCategoryIcon = (id: CategoryId) => {
    switch (id) {
      case 'all':
        return <UtensilsCrossed className="w-3.5 h-3.5" />
      case 'starters':
      case 'cat-1':
        return <Flame className="w-3.5 h-3.5" />
      case 'mains':
      case 'cat-2':
        return <CookingPot className="w-3.5 h-3.5" />
      case 'pizza-pasta':
      case 'cat-3':
        return <Pizza className="w-3.5 h-3.5" />
      case 'beverages':
      case 'cat-4':
        return <GlassWater className="w-3.5 h-3.5" />
      case 'desserts':
      case 'cat-5':
        return <Cake className="w-3.5 h-3.5" />
      default:
        return <UtensilsCrossed className="w-3.5 h-3.5" />
    }
  }

  return (
    <div className="sticky top-15 sm:top-16 z-20 bg-canvas/90 backdrop-blur-md border-b border-beige/80 py-2 sm:py-2.5 transition-all">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {/* Categories Pill Slider */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {categories.map((category) => {
              const isActive = activeCategory === category.id

              return (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95',
                    isActive
                      ? 'bg-charcoal text-white shadow-xs font-semibold'
                      : 'bg-white hover:bg-cream-100 text-charcoal border border-beige hover:border-gold-300'
                  )}
                >
                  <span className={isActive ? 'text-gold' : 'text-charcoal-600'}>
                    {getCategoryIcon(category.id)}
                  </span>
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>

          {/* Quick Dietary Filters (Veg / Non-Veg) */}
          <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-beige">
            <button
              onClick={() => onSelectDietaryFilter(dietaryFilter === 'veg' ? 'all' : 'veg')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border active:scale-95',
                dietaryFilter === 'veg'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
              )}
              title="Filter vegetarian only"
            >
              <Leaf className="w-3 h-3" />
              <span>Veg</span>
            </button>

            <button
              onClick={() => onSelectDietaryFilter(dietaryFilter === 'non-veg' ? 'all' : 'non-veg')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border active:scale-95',
                dietaryFilter === 'non-veg'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
              )}
              title="Filter non-vegetarian only"
            >
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span>Non-Veg</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

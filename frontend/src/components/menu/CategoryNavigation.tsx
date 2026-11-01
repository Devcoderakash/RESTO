import React from 'react'
import {
  UtensilsCrossed,
  Flame,
  CookingPot,
  Pizza,
  GlassWater,
  Cake,
  Leaf,
  Sparkles,
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
  showChefSpecialsOnly,
  onToggleChefSpecials,
  categoryCounts,
  categories,
}) => {
  const getCategoryIcon = (id: CategoryId) => {
    switch (id) {
      case 'all':
        return <UtensilsCrossed className="w-4 h-4" />
      case 'starters':
        return <Flame className="w-4 h-4" />
      case 'mains':
        return <CookingPot className="w-4 h-4" />
      case 'pizza-pasta':
        return <Pizza className="w-4 h-4" />
      case 'beverages':
        return <GlassWater className="w-4 h-4" />
      case 'desserts':
        return <Cake className="w-4 h-4" />
      default:
        return <UtensilsCrossed className="w-4 h-4" />
    }
  }

  return (
    <div className="sticky top-16 z-20 bg-[#FAF8F3]/95 backdrop-blur-md border-b border-[#E9E4DA] py-2.5 shadow-2xs transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Categories Horizontal Slider */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {categories.map((category) => {
              const isActive = activeCategory === category.id

              return (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#22211F] text-[#FAF8F3] shadow-xs'
                      : 'bg-white hover:bg-[#F5F2EB] text-[#22211F] border border-[#E9E4DA]'
                  )}
                >
                  <span className={isActive ? 'text-[#B99A62]' : 'text-[#77736D]'}>
                    {getCategoryIcon(category.id)}
                  </span>
                  <span>{category.name}</span>
                </button>
              )
            })}
          </div>

          {/* Veg / Non-Veg Quick Toggles */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[#E9E4DA]">
            <button
              onClick={() => onSelectDietaryFilter(dietaryFilter === 'veg' ? 'all' : 'veg')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                dietaryFilter === 'veg'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
              )}
              title="Vegetarian only"
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Veg</span>
            </button>

            <button
              onClick={() => onSelectDietaryFilter(dietaryFilter === 'non-veg' ? 'all' : 'non-veg')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                dietaryFilter === 'non-veg'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
              )}
              title="Non-Vegetarian only"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Non-Veg</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

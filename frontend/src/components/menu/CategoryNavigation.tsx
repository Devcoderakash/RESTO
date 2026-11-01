import React, { useRef } from 'react'
import {
  UtensilsCrossed,
  Flame,
  CookingPot,
  Pizza,
  GlassWater,
  Cake,
} from 'lucide-react'
import { CategoryId, MenuCategory } from '../../types/menu'
import { cn } from '../../lib/utils'

interface CategoryNavigationProps {
  activeCategory: CategoryId
  onSelectCategory: (id: CategoryId) => void
  categoryCounts: Record<CategoryId, number>
  categories: MenuCategory[]
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  activeCategory,
  onSelectCategory,
  categoryCounts,
  categories,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

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
    <nav
      aria-label="Food categories navigation"
      className="sticky top-0 z-20 bg-canvas/95 backdrop-blur-md border-b border-beige/80 py-2 sm:py-2.5 transition-all"
    >
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
        <div
          ref={containerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {categories.map((category) => {
            const isActive = activeCategory === category.id
            const count = categoryCounts[category.id]

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  'shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 shadow-2xs',
                  isActive
                    ? 'bg-charcoal text-white shadow-soft ring-1 ring-gold/40'
                    : 'bg-white hover:bg-cream-100 text-charcoal-700 border border-beige hover:border-gold-300'
                )}
              >
                <span className={isActive ? 'text-gold' : 'text-charcoal-600'}>
                  {getCategoryIcon(category.id)}
                </span>
                <span>{category.name}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold',
                      isActive
                        ? 'bg-white/20 text-gold-200'
                        : 'bg-cream-200/70 text-charcoal-600'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

import React from 'react'
import { Leaf, Flame, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DietaryFilterBarProps {
  dietaryFilter: 'all' | 'veg' | 'non-veg'
  onSelectDietaryFilter: (filter: 'all' | 'veg' | 'non-veg') => void
  showChefSpecialsOnly: boolean
  onToggleChefSpecials: () => void
  totalCount?: number
}

export const DietaryFilterBar: React.FC<DietaryFilterBarProps> = ({
  dietaryFilter,
  onSelectDietaryFilter,
  showChefSpecialsOnly,
  onToggleChefSpecials,
}) => {
  return (
    <div className="py-2.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
      {/* 3-State Segmented Dietary Filter */}
      <div className="inline-flex items-center p-1 rounded-xl bg-white border border-beige/90 shadow-2xs shrink-0">
        <button
          type="button"
          onClick={() => onSelectDietaryFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            dietaryFilter === 'all'
              ? 'bg-charcoal text-white shadow-2xs'
              : 'text-charcoal-600 hover:text-charcoal hover:bg-cream-100/60'
          )}
        >
          All Dishes
        </button>

        <button
          type="button"
          onClick={() => onSelectDietaryFilter('veg')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            dietaryFilter === 'veg'
              ? 'bg-emerald text-white shadow-2xs'
              : 'text-charcoal-600 hover:text-charcoal hover:bg-cream-100/60'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-600/30" />
          <span>Veg Only</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectDietaryFilter('non-veg')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            dietaryFilter === 'non-veg'
              ? 'bg-rose-700 text-white shadow-2xs'
              : 'text-charcoal-600 hover:text-charcoal hover:bg-cream-100/60'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-600/30" />
          <span>Non-Veg</span>
        </button>
      </div>

      {/* Chef's Signature Toggle */}
      <button
        type="button"
        onClick={onToggleChefSpecials}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 shrink-0 shadow-2xs',
          showChefSpecialsOnly
            ? 'bg-gold-50 border-gold-400 text-charcoal ring-1 ring-gold/40'
            : 'bg-white border-beige text-charcoal-600 hover:text-charcoal hover:border-gold-300'
        )}
      >
        <Sparkles className={cn('w-3.5 h-3.5', showChefSpecialsOnly ? 'text-gold-700 fill-gold-600/30' : 'text-gold')} />
        <span>Chef's Choice</span>
      </button>
    </div>
  )
}


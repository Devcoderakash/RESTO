import React from 'react'
import { cn } from '../../lib/utils'

interface DietaryBadgeProps {
  isVeg: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export const DietaryBadge: React.FC<DietaryBadgeProps> = ({
  isVeg,
  size = 'md',
  showLabel = false,
  className,
}) => {
  const boxSizes = {
    sm: 'w-3.5 h-3.5 p-[2px]',
    md: 'w-4 h-4 p-[2.5px]',
    lg: 'w-5 h-5 p-[3px]',
  }

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 shrink-0', className)}>
      <span
        title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
        className={cn(
          'border flex items-center justify-center rounded-[3px] bg-white transition-all',
          boxSizes[size],
          isVeg ? 'border-emerald-600' : 'border-rose-700'
        )}
      >
        {isVeg ? (
          <span className={cn('rounded-full bg-emerald-600', dotSizes[size])} />
        ) : (
          <span
            className={cn(
              'border-solid',
              size === 'sm'
                ? 'w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-rose-700'
                : 'w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-rose-700'
            )}
          />
        )}
      </span>

      {showLabel && (
        <span
          className={cn(
            'font-medium text-xs tracking-wider uppercase',
            isVeg ? 'text-emerald-700' : 'text-rose-700'
          )}
        >
          {isVeg ? 'Veg' : 'Non-Veg'}
        </span>
      )}
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed, ChevronDown } from 'lucide-react'
import { useTableStore } from '../../store/tableStore'
import { cn } from '../../lib/utils'

interface TableIndicatorProps {
  onOpenSwitchModal?: () => void
  compact?: boolean
  className?: string
}

export const TableIndicator: React.FC<TableIndicatorProps> = ({
  onOpenSwitchModal,
  compact = false,
  className,
}) => {
  const { currentTable } = useTableStore()

  if (compact) {
    return (
      <Link
        to="/select-table"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-50 border border-gold-200/80 text-charcoal text-xs font-medium hover:bg-gold-100 transition-colors',
          className
        )}
        title="Tap to change table"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
        <span className="font-semibold text-gold-700 tracking-wider">TABLE {currentTable || '07'}</span>
        <ChevronDown className="w-3 h-3 text-gold-600" />
      </Link>
    )
  }

  return (
    <Link
      to="/select-table"
      className={cn(
        'group inline-flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-cream-100/90 hover:bg-white border border-gold/40 hover:border-gold transition-all duration-200 shadow-sm',
        className
      )}
      title="Tap to change table number"
    >
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gold/15 text-gold-700 group-hover:scale-110 transition-transform">
        <UtensilsCrossed className="w-3.5 h-3.5" />
      </div>

      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-charcoal">
        <span className="tracking-wide text-charcoal-600 uppercase text-[10px] sm:text-xs">
          Dining at
        </span>
        <span className="font-bold text-gold-700 tracking-wider">
          TABLE {currentTable || '07'}
        </span>
      </div>

      <span className="text-[10px] text-gold-700 font-semibold underline ml-1 group-hover:text-charcoal transition-colors">
        Change
      </span>
    </Link>
  )
}

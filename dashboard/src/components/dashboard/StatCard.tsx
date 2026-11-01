import React from 'react'
import { Card } from '../ui/Card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    isPositive: boolean
    label?: string
  }
  icon: React.ElementType
  subtext?: string
  accentColor?: 'brand' | 'blue' | 'emerald' | 'amber' | 'purple'
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  subtext,
  accentColor = 'brand',
}) => {
  const iconColors = {
    brand: 'bg-brand-50 text-brand border-brand/20',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  }

  return (
    <Card hoverEffect className="p-5 flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-charcoal mt-1 tracking-tight font-serif">
            {value}
          </h3>
        </div>
        <div
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 shadow-2xs',
            iconColors[accentColor]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-beige/60 flex items-center justify-between text-xs">
        {change ? (
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                change.isPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              )}
            >
              {change.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {change.value}
            </span>
            <span className="text-charcoal-muted">{change.label || 'vs yesterday'}</span>
          </div>
        ) : (
          <span className="text-charcoal-muted">{subtext}</span>
        )}
      </div>
    </Card>
  )
}


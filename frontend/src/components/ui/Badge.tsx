import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'charcoal' | 'outline' | 'veg' | 'nonveg' | 'muted'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'gold',
  size = 'md',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full tracking-wider uppercase'

  const variants = {
    gold: 'bg-gold-50 text-gold-700 border border-gold-200/80',
    charcoal: 'bg-charcoal text-cream-100',
    outline: 'border border-beige-dark text-charcoal-600 bg-white/70',
    veg: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    nonveg: 'bg-rose-50 text-rose-800 border border-rose-200',
    muted: 'bg-cream-200 text-charcoal-600',
  }

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 leading-none',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  )
}

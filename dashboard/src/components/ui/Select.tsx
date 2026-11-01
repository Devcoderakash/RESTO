import React from 'react'
import { cn } from '../../lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, children, id, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs font-semibold uppercase tracking-wider text-charcoal-soft mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={generatedId}
            ref={ref}
            className={cn(
              'w-full bg-white text-charcoal text-sm rounded-xl border border-beige px-3.5 py-2.5 pr-10 appearance-none transition-all duration-200 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-canvas disabled:text-charcoal-muted disabled:cursor-not-allowed cursor-pointer',
              error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-200',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal-muted">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-charcoal-muted mt-1">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'


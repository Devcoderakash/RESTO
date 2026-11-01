import React from 'react'
import { cn } from '../../lib/utils'

export interface TabItem {
  id: string
  label: string
  count?: number
  icon?: React.ReactNode
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'underline' | 'pills'
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className,
}) => {
  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'inline-flex p-1 bg-beige-light/70 rounded-xl border border-beige/60 overflow-x-auto max-w-full',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-white text-charcoal shadow-sm border border-beige/40 font-semibold'
                  : 'text-charcoal-muted hover:text-charcoal hover:bg-white/40'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-semibold',
                    isActive ? 'bg-brand/15 text-brand-900' : 'bg-charcoal/10 text-charcoal-muted'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Underline variant
  return (
    <div className={cn('border-b border-beige overflow-x-auto flex gap-6', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 pb-3 pt-1 text-sm font-medium border-b-2 transition-all whitespace-nowrap -mb-px',
              isActive
                ? 'border-brand text-charcoal font-semibold'
                : 'border-transparent text-charcoal-muted hover:text-charcoal hover:border-beige-dark'
            )}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[11px] font-semibold',
                  isActive ? 'bg-brand/15 text-brand-900' : 'bg-beige text-charcoal-muted'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}


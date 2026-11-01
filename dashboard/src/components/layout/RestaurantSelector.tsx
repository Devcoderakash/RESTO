import React, { useState, useRef, useEffect } from 'react'
import { Building2, ChevronDown, Check, Plus } from 'lucide-react'
import { useRestaurantStore } from '../../store/useRestaurantStore'
import { toast } from 'sonner'

export const RestaurantSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { branches, currentBranchId, switchBranch } = useRestaurantStore()

  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: string, name: string) => {
    switchBranch(id)
    setIsOpen(false)
    toast.success(`Switched branch to ${name}`)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-beige bg-white hover:bg-beige-light/50 transition-colors text-left shadow-2xs group"
      >
        <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand flex items-center justify-center border border-brand/20 shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold text-charcoal line-clamp-1">
            {currentBranch.name}
          </span>
          <span className="text-[10px] text-charcoal-muted line-clamp-1">
            {currentBranch.branch}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-charcoal-muted ml-1 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-dropdown border border-beige p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-beige/60">
            <p className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider">
              Restaurant Locations
            </p>
          </div>
          <div className="py-1 space-y-1">
            {branches.map((branch) => {
              const isSelected = branch.id === currentBranchId
              return (
                <button
                  key={branch.id}
                  onClick={() => handleSelect(branch.id, branch.name)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-brand-50 text-brand-900 font-medium'
                      : 'hover:bg-canvas text-charcoal'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold truncate">{branch.name}</p>
                    <p className="text-[11px] text-charcoal-muted truncate">{branch.branch}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand shrink-0" />}
                </button>
              )
            })}
          </div>
          <div className="pt-2 border-t border-beige/60 mt-1">
            <button
              onClick={() => {
                setIsOpen(false)
                toast.info('Multi-outlet expansion feature unlocked in Super Admin tier')
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-brand hover:bg-brand-50 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Location
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


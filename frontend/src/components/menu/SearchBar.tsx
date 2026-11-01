import React from 'react'
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react'

export type SortOption = 'recommended' | 'price-asc' | 'price-desc' | 'popular'

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  totalResults: number
  searchInputRef?: React.RefObject<HTMLInputElement | null>
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  totalResults,
  searchInputRef,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-600" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search food items..."
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#E9E4DA] bg-white text-[#22211F] text-sm placeholder:text-[#77736D]/60 focus:outline-none focus:ring-2 focus:ring-[#B99A62]/30 focus:border-[#B99A62] transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-charcoal-600 hover:text-charcoal rounded-full"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sort Select */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-beige bg-white text-xs text-charcoal">
          <ArrowUpDown className="w-3.5 h-3.5 text-gold-700" />
          <span className="text-charcoal-600 hidden md:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-charcoal font-medium text-xs focus:outline-none cursor-pointer"
          >
            <option value="recommended">Chef Recommended</option>
            <option value="popular">Most Popular</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        <span className="text-xs text-charcoal-600 px-1 hidden sm:inline">
          {totalResults} {totalResults === 1 ? 'dish' : 'dishes'}
        </span>
      </div>
    </div>
  )
}

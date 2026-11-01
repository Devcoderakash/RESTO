import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { RestaurantHeader } from '../components/layout/RestaurantHeader'
import { CategoryNavigation } from '../components/menu/CategoryNavigation'
import { DietaryFilterBar } from '../components/menu/DietaryFilterBar'
import { SearchBar, SortOption } from '../components/menu/SearchBar'
import { FoodGrid } from '../components/menu/FoodGrid'
import { FoodDetailModal } from '../components/modals/FoodDetailModal'
import { CartDrawer } from '../components/cart/CartDrawer'
import { MobileCartBar } from '../components/layout/MobileCartBar'
import { WifiModal } from '../components/modals/WifiModal'
import { CallWaiterModal } from '../components/modals/CallWaiterModal'
import { RequestBillModal } from '../components/modals/RequestBillModal'
import { TableSwitchModal } from '../components/modals/TableSwitchModal'
import { useTableStore } from '../store/tableStore'
import { FoodItem, CategoryId, MenuCategory } from '../types/menu'
import { toast } from 'sonner'
import { getAvailableTables, getMenu } from '../services/api'

export const MenuPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentTable, hasSelectedTable, setTable } = useTableStore()
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([{ id: 'all', name: 'All Items' }])
  const [isMenuLoading, setIsMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [menuRefresh, setMenuRefresh] = useState(0)

  // Modals state
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false)
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false)
  const [isBillModalOpen, setIsBillModalOpen] = useState(false)
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)

  // Filters & Search state
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all')
  const [showChefSpecialsOnly, setShowChefSpecialsOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('recommended')

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    getMenu()
      .then((response) => {
        if (!active) return
        setFoodItems(response.items)
        setMenuCategories([{ id: 'all', name: 'All Items', icon: 'UtensilsCrossed' }, ...response.categories])
        setMenuError(null)
      })
      .catch((error: unknown) => {
        if (active) setMenuError(error instanceof Error ? error.message : 'Unable to load the menu.')
      })
      .finally(() => {
        if (active) setIsMenuLoading(false)
      })
    return () => {
      active = false
    }
  }, [menuRefresh])

  // QR Table Parameter detection from URL (e.g. /menu?table=07 or /?table=01)
  useEffect(() => {
    const tableParam = searchParams.get('table')
    if (tableParam) {
      let active = true
      getAvailableTables()
        .then((response) => {
          if (!active) return
          const tables = Array.isArray(response) ? response : response.tables
          const normalized = tableParam.padStart(2, '0')
          const table = tables.find((candidate) => candidate.number.padStart(2, '0') === normalized)
          if (table?.status.toLowerCase() === 'available' || (hasSelectedTable && currentTable === normalized)) {
            setTable(normalized, true)
          } else {
            toast.error(`Table ${normalized} is unavailable. Please select an available table.`)
            navigate('/select-table', { replace: true })
          }
        })
        .catch((error: unknown) => {
          if (active) {
            toast.error(error instanceof Error ? error.message : 'Unable to verify table availability.')
            navigate('/select-table', { replace: true })
          }
        })
      if (searchParams.get('switchTable') === 'true') {
        setIsTableModalOpen(true)
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('switchTable')
        setSearchParams(nextParams, { replace: true })
      }
      return () => {
        active = false
      }
    }

    if (searchParams.get('switchTable') === 'true') {
      setIsTableModalOpen(true)
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('switchTable')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setTable, setSearchParams, hasSelectedTable, currentTable, navigate])

  const handleFocusSearch = () => {
    searchInputRef.current?.focus()
  }

  // Category counts computation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: foodItems.length }
    menuCategories.forEach((category) => {
      if (category.id !== 'all') {
        counts[category.id] = foodItems.filter((item) => item.category === category.id).length
      }
    })
    return counts
  }, [foodItems, menuCategories])

  // Filtered and Sorted Menu Items
  const filteredItems = useMemo(() => {
    let result = [...foodItems]

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter((item) => item.category === activeCategory)
    }

    // Dietary filter
    if (dietaryFilter === 'veg') {
      result = result.filter((item) => item.isVegetarian)
    } else if (dietaryFilter === 'non-veg') {
      result = result.filter((item) => !item.isVegetarian)
    }

    // Chef special filter
    if (showChefSpecialsOnly) {
      result = result.filter((item) => item.isChefSpecial)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'popular':
        result.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0))
        break
      case 'recommended':
      default:
        result.sort((a, b) => (b.isChefSpecial ? 1 : 0) - (a.isChefSpecial ? 1 : 0))
        break
    }

    return result
  }, [activeCategory, dietaryFilter, foodItems, showChefSpecialsOnly, searchQuery, sortBy])

  const handleSelectItem = (item: FoodItem) => {
    setSelectedFood(item)
    setIsDetailModalOpen(true)
  }

  const handleResetFilters = () => {
    setActiveCategory('all')
    setDietaryFilter('all')
    setShowChefSpecialsOnly(false)
    setSearchQuery('')
    setSortBy('recommended')
    toast.info('Menu filters have been reset')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F3]">
      {/* Navigation Header */}
      <RestaurantHeader
        onOpenWifiModal={() => setIsWifiModalOpen(true)}
        onOpenCallWaiterModal={() => setIsWaiterModalOpen(true)}
        onOpenRequestBillModal={() => setIsBillModalOpen(true)}
        onOpenTableSwitchModal={() => setIsTableModalOpen(true)}
        onFocusSearch={handleFocusSearch}
      />

      <main className="flex-1 pb-32">
        {/* Sticky Category Navigation */}
        <CategoryNavigation
          activeCategory={activeCategory}
          onSelectCategory={(id) => {
            setActiveCategory(id)
            if (searchQuery) setSearchQuery('')
          }}
          categoryCounts={categoryCounts}
          categories={menuCategories}
        />

        {/* Dietary Filters, Search & Menu Items */}
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-2 sm:pt-4 space-y-1">
          {/* Dedicated Dietary Filter Row */}
          <DietaryFilterBar
            dietaryFilter={dietaryFilter}
            onSelectDietaryFilter={setDietaryFilter}
            showChefSpecialsOnly={showChefSpecialsOnly}
            onToggleChefSpecials={() => setShowChefSpecialsOnly(!showChefSpecialsOnly)}
          />

          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalResults={filteredItems.length}
            searchInputRef={searchInputRef}
          />

          {isMenuLoading && (
            <div className="py-16 text-center text-sm text-[#77736D]">
              <div className="w-8 h-8 mx-auto mb-3 border-2 border-[#B99A62] border-t-transparent rounded-full animate-spin" />
              <p>Loading menu...</p>
            </div>
          )}

          {menuError && (
            <div role="alert" className="my-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-800">
              <p>{menuError}</p>
              <button
                type="button"
                onClick={() => {
                  setMenuError(null)
                  setIsMenuLoading(true)
                  setMenuRefresh((value) => value + 1)
                }}
                className="mt-2 font-semibold text-rose-900 underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isMenuLoading && !menuError && (
            <FoodGrid
              items={filteredItems}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              onSelectItem={handleSelectItem}
              onResetFilters={handleResetFilters}
              categories={menuCategories}
            />
          )}
        </div>
      </main>

      {/* Modals & Drawers */}
      <FoodDetailModal
        foodItem={selectedFood}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedFood(null)
        }}
      />

      <CartDrawer />
      <MobileCartBar />

      <WifiModal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
      />

      <CallWaiterModal
        isOpen={isWaiterModalOpen}
        onClose={() => setIsWaiterModalOpen(false)}
      />

      <RequestBillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
      />

      <TableSwitchModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
      />
    </div>
  )
}

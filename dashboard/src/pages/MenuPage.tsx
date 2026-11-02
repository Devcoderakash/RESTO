import React, { useState, useEffect } from 'react'
import {
  UtensilsCrossed,
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  Flame,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { MenuItemCard } from '../components/menu/MenuItemCard'
import { MenuTableView } from '../components/menu/MenuTableView'
import { MenuItemModal } from '../components/menu/MenuItemModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { useMenuStore } from '../store/useMenuStore'
import { MenuItem } from '../types'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

export const MenuPage: React.FC = () => {
  const {
    items,
    categories,
    isLoading,
    isRefreshing,
    searchQuery,
    categoryFilter,
    dietFilter,
    availabilityFilter,
    viewMode,
    fetchMenu,
    setSearchQuery,
    setCategoryFilter,
    setDietFilter,
    setAvailabilityFilter,
    setViewMode,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleItemAvailability,
    toggleItemPopular,
  } = useMenuStore()

  useEffect(() => {
    void fetchMenu()
  }, [fetchMenu])

  const [activeItemModal, setActiveItemModal] = useState<MenuItem | null | 'NEW'>(null)
  const [deleteModalItem, setDeleteModalItem] = useState<MenuItem | null>(null)

  // Category Tabs
  const categoryTabs = [
    { id: 'ALL', label: 'All Items', count: items.length },
    ...categories.map((c) => ({
      id: c.id,
      label: c.name,
      count: items.filter((i) => i.categoryId === c.id).length,
    })),
  ]

  // Filtered Items
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== 'ALL' && item.categoryId !== categoryFilter) return false
    if (dietFilter === 'VEG' && !item.isVeg) return false
    if (dietFilter === 'NONVEG' && item.isVeg) return false
    if (availabilityFilter === 'AVAILABLE' && !item.isAvailable) return false
    if (availabilityFilter === 'UNAVAILABLE' && item.isAvailable) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesName = item.name.toLowerCase().includes(q)
      const matchesDesc = item.description.toLowerCase().includes(q)
      const matchesCategory = item.categoryName.toLowerCase().includes(q)
      if (!matchesName && !matchesDesc && !matchesCategory) return false
    }

    return true
  })

  const handleSaveItem = async (data: Omit<MenuItem, 'id' | 'createdAt'>) => {
    if (activeItemModal === 'NEW') {
      if (!await addMenuItem(data)) return false
      toast.success(`"${data.name}" added to menu`)
    } else if (activeItemModal) {
      if (!await updateMenuItem(activeItemModal.id, data)) return false
      toast.success(`"${data.name}" updated`)
    }
    setActiveItemModal(null)
    return true
  }

  const handleDeleteConfirm = async () => {
    if (deleteModalItem) {
      if (!await deleteMenuItem(deleteModalItem.id)) return
      toast.success(`"${deleteModalItem.name}" deleted from menu`)
      setDeleteModalItem(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal">
            Menu Management
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Configure dishes, prices, preparation timing, and real-time stock availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/categories">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Layers className="w-4 h-4" />}
            >
              Manage Categories
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveItemModal('NEW')}
          >
            Add New Item
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs
        tabs={categoryTabs}
        activeTab={categoryFilter}
        onChange={setCategoryFilter}
        variant="pills"
      />

      {/* Toolbar: Search, Diet, Stock, View Toggle */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search dishes by name or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Diet Filter */}
            <select
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value as any)}
              className="bg-white border border-beige rounded-xl px-3 py-2 text-xs text-charcoal font-medium focus:outline-none focus:border-brand cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Diets</option>
              <option value="VEG">Vegetarian Only</option>
              <option value="NONVEG">Non-Veg Only</option>
            </select>

            {/* Availability Filter */}
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as any)}
              className="bg-white border border-beige rounded-xl px-3 py-2 text-xs text-charcoal font-medium focus:outline-none focus:border-brand cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Stock Status</option>
              <option value="AVAILABLE">In Stock Only</option>
              <option value="UNAVAILABLE">Sold Out Only</option>
            </select>

            {/* Grid vs Table View Mode */}
            <div className="inline-flex p-1 bg-canvas rounded-xl border border-beige text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-brand shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-brand shadow-xs'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Menu Items List */}
      {isRefreshing && (
        <div className="mb-3 text-right">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200 animate-pulse">
            Syncing menu catalog…
          </span>
        </div>
      )}
      {isLoading && items.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-2xl bg-white border border-beige/80 p-4 animate-pulse space-y-3">
              <div className="w-full h-36 bg-cream-200 rounded-xl" />
              <div className="h-4 w-3/4 bg-cream-200 rounded" />
              <div className="h-3 w-1/2 bg-cream-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No menu items match your criteria"
          description="Try resetting your filters or create a new dish item."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('')
            setCategoryFilter('ALL')
            setDietFilter('ALL')
            setAvailabilityFilter('ALL')
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onEdit={(i) => setActiveItemModal(i)}
              onDelete={(i) => setDeleteModalItem(i)}
              onToggleAvailability={toggleItemAvailability}
              onTogglePopular={toggleItemPopular}
            />
          ))}
        </div>
      ) : (
        <MenuTableView
          items={filteredItems}
          onEdit={(i) => setActiveItemModal(i)}
          onDelete={(i) => setDeleteModalItem(i)}
          onToggleAvailability={toggleItemAvailability}
          onTogglePopular={toggleItemPopular}
        />
      )}

      {/* Add / Edit Item Modal */}
      <MenuItemModal
        item={activeItemModal === 'NEW' ? null : activeItemModal}
        categories={categories}
        isOpen={!!activeItemModal}
        onClose={() => setActiveItemModal(null)}
        onSave={handleSaveItem}
      />

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteModalItem}
        onClose={() => setDeleteModalItem(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete "${deleteModalItem?.name}"?`}
        message="Are you sure you want to remove this dish from the menu? Guests scanning QR codes will no longer see this dish."
        confirmText="Delete Dish"
      />
    </div>
  )
}

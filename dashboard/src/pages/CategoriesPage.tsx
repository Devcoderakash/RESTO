import React, { useState, useEffect } from 'react'
import { Layers, Plus, ArrowUpDown, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { CategoryCard } from '../components/categories/CategoryCard'
import { CategoryModal } from '../components/categories/CategoryModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { useMenuStore } from '../store/useMenuStore'
import { Category } from '../types'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

export const CategoriesPage: React.FC = () => {
  const {
    categories,
    items,
    fetchMenu,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
    reorderCategories,
  } = useMenuStore()

  useEffect(() => {
    void fetchMenu()
  }, [fetchMenu])

  const [activeCatModal, setActiveCatModal] = useState<Category | null | 'NEW'>(null)
  const [deleteModalCat, setDeleteModalCat] = useState<Category | null>(null)

  const handleSaveCategory = async (data: Omit<Category, 'id' | 'itemCount'>) => {
    if (activeCatModal === 'NEW') {
      if (!await addCategory(data)) return false
      toast.success(`Category "${data.name}" created`)
    } else if (activeCatModal) {
      if (!await updateCategory(activeCatModal.id, data)) return false
      toast.success(`Category "${data.name}" updated`)
    }
    setActiveCatModal(null)
    return true
  }

  const handleDeleteConfirm = async () => {
    if (deleteModalCat) {
      const itemsInCat = items.filter((i) => i.categoryId === deleteModalCat.id).length
      if (itemsInCat > 0) {
        toast.error(`Cannot delete category with ${itemsInCat} active dishes. Reassign them first.`)
        setDeleteModalCat(null)
        return
      }
      if (!await deleteCategory(deleteModalCat.id)) return
      toast.success(`Category "${deleteModalCat.name}" deleted`)
      setDeleteModalCat(null)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index > 0) {
      if (await reorderCategories(index, index - 1)) toast.success('Category order updated')
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index < categories.length - 1) {
      if (await reorderCategories(index, index + 1)) toast.success('Category order updated')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal">
            Category Management
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Structure your QR menu sections, reorder presentation flow, and configure category visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/menu">
            <Button variant="outline" size="sm">
              View All Dishes ({items.length})
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setActiveCatModal('NEW')}
          >
            Create Category
          </Button>
        </div>
      </div>

      {/* Grid of Categories */}
      {categories.length === 0 ? (
        <EmptyState
          title="No categories created"
          description="Create your first category like Starters, Main Course, or Cocktails."
          actionLabel="Add Category"
          onAction={() => setActiveCatModal('NEW')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {categories.map((cat, idx) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              index={idx}
              totalCount={categories.length}
              onEdit={(c) => setActiveCatModal(c)}
              onDelete={(c) => setDeleteModalCat(c)}
              onToggleActive={toggleCategoryActive}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <CategoryModal
        category={activeCatModal === 'NEW' ? null : activeCatModal}
        isOpen={!!activeCatModal}
        onClose={() => setActiveCatModal(null)}
        onSave={handleSaveCategory}
      />

      {/* Delete Category Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteModalCat}
        onClose={() => setDeleteModalCat(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete Category "${deleteModalCat?.name}"?`}
        message="Are you sure you want to delete this category? Make sure no active dishes are assigned to it."
        confirmText="Delete Category"
      />
    </div>
  )
}

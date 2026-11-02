import { create } from 'zustand'
import { toast } from 'sonner'
import { MenuItem, Category } from '../types'
import { dashboardApi } from '../services/api'

interface MenuState {
  items: MenuItem[]
  categories: Category[]
  selectedItem: MenuItem | null
  selectedCategory: Category | null
  searchQuery: string
  categoryFilter: string
  dietFilter: 'ALL' | 'VEG' | 'NONVEG'
  availabilityFilter: 'ALL' | 'AVAILABLE' | 'UNAVAILABLE'
  viewMode: 'grid' | 'table'
  setMenu: (items: MenuItem[], categories: Category[]) => void
  fetchMenu: () => Promise<void>
  setSelectedItem: (item: MenuItem | null) => void
  setSelectedCategory: (cat: Category | null) => void
  setSearchQuery: (query: string) => void
  setCategoryFilter: (catId: string) => void
  setDietFilter: (diet: 'ALL' | 'VEG' | 'NONVEG') => void
  setAvailabilityFilter: (avail: 'ALL' | 'AVAILABLE' | 'UNAVAILABLE') => void
  setViewMode: (mode: 'grid' | 'table') => void
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt'>) => Promise<boolean>
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<boolean>
  deleteMenuItem: (id: string) => Promise<boolean>
  toggleItemAvailability: (id: string) => Promise<boolean>
  toggleItemPopular: (id: string) => Promise<boolean>
  addCategory: (cat: Omit<Category, 'id' | 'itemCount'>) => Promise<boolean>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  toggleCategoryActive: (id: string) => Promise<boolean>
  reorderCategories: (startIndex: number, endIndex: number) => Promise<boolean>
  resetMenu: () => void
}

export const useMenuStore = create<MenuState>((set, get) => ({
  items: [],
  categories: [],
  selectedItem: null,
  selectedCategory: null,
  searchQuery: '',
  categoryFilter: 'ALL',
  dietFilter: 'ALL',
  availabilityFilter: 'ALL',
  viewMode: 'grid',
  setMenu: (items, categories) => set({ items, categories }),
  fetchMenu: async () => {
    try {
      const menu = await dashboardApi.getMenu()
      set({ items: menu.items, categories: menu.categories })
    } catch (error) {
      console.warn('Failed to fetch menu:', error)
    }
  },
  setSelectedItem: (item) => set({ selectedItem: item }),
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (catId) => set({ categoryFilter: catId }),
  setDietFilter: (diet) => set({ dietFilter: diet }),
  setAvailabilityFilter: (avail) => set({ availabilityFilter: avail }),
  setViewMode: (mode) => set({ viewMode: mode }),
  addMenuItem: async (itemInput) => {
    try {
      const item = await dashboardApi.createMenuItem(itemInput)
      set((state) => ({ items: [{ ...item, ...itemInput }, ...state.items] }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Menu item could not be added.')
      return false
    }
  },
  updateMenuItem: async (id, updates) => {
    try {
      await dashboardApi.updateMenuItem(id, updates)
      set((state) => ({
        items: state.items.map((item) => item.id === id ? { ...item, ...updates } : item),
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Menu item could not be updated.')
      return false
    }
  },
  deleteMenuItem: async (id) => {
    try {
      await dashboardApi.deleteMenuItem(id)
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Menu item could not be removed.')
      return false
    }
  },
  toggleItemAvailability: async (id) => {
    const item = get().items.find((candidate) => candidate.id === id)
    if (!item) {
      toast.error('Menu item not found.')
      return false
    }
    const available = !item.isAvailable
    try {
      await dashboardApi.setMenuItemAvailability(id, available)
      set((state) => ({
        items: state.items.map((candidate) => candidate.id === id
          ? { ...candidate, isAvailable: available }
          : candidate),
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Menu availability could not be changed.')
      return false
    }
  },
  toggleItemPopular: async (id) => {
    const item = get().items.find((candidate) => candidate.id === id)
    if (!item) {
      toast.error('Menu item not found.')
      return false
    }
    return get().updateMenuItem(id, { isPopular: !item.isPopular })
  },
  addCategory: async (category) => {
    try {
      await dashboardApi.createCategory(category)
      const menu = await dashboardApi.getMenu()
      set({ items: menu.items, categories: menu.categories })
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Category could not be added.')
      return false
    }
  },
  updateCategory: async (id, updates) => {
    try {
      await dashboardApi.updateCategory(id, updates)
      set((state) => ({
        categories: state.categories.map((category) =>
          category.id === id ? { ...category, ...updates } : category,
        ),
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Category could not be updated.')
      return false
    }
  },
  deleteCategory: async (id) => {
    try {
      await dashboardApi.deleteCategory(id)
      set((state) => ({
        categories: state.categories.filter((category) => category.id !== id),
        items: state.items.map((item) => item.categoryId === id
          ? { ...item, categoryId: '', categoryName: 'Uncategorized' }
          : item),
      }))
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Category could not be removed.')
      return false
    }
  },
  toggleCategoryActive: async (id) => {
    const category = get().categories.find((candidate) => candidate.id === id)
    if (!category) {
      toast.error('Category not found.')
      return false
    }
    return get().updateCategory(id, { isActive: !category.isActive })
  },
  reorderCategories: async (startIndex, endIndex) => {
    const categories = [...get().categories]
    if (startIndex < 0 || endIndex < 0 || startIndex >= categories.length || endIndex >= categories.length) {
      return false
    }
    const [moved] = categories.splice(startIndex, 1)
    categories.splice(endIndex, 0, moved)
    try {
      for (const [index, category] of categories.entries()) {
        await dashboardApi.updateCategory(category.id, { sortOrder: index })
      }
      set({ categories: categories.map((category, sortOrder) => ({ ...category, sortOrder })) })
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Category order could not be saved.')
      try {
        const menu = await dashboardApi.getMenu()
        set({ items: menu.items, categories: menu.categories })
      } catch (refreshError) {
        toast.error(refreshError instanceof Error ? refreshError.message : 'Menu could not be refreshed.')
      }
      return false
    }
  },
  resetMenu: () => {
    toast.error('Menu data cannot be reset from the dashboard.')
  },
}))

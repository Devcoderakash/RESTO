import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, SelectedCustomization, BillBreakdown } from '../types/cart'
import { FoodItem } from '../types/menu'

interface CartState {
  items: CartItem[]
  tableNumber: string
  isDrawerOpen: boolean
  
  // Actions
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  setTableNumber: (table: string) => void
  addItem: (
    food: FoodItem,
    customizations: SelectedCustomization[],
    quantity: number,
    instructions?: string
  ) => void
  updateQuantity: (cartItemId: string, newQuantity: number) => void
  removeItem: (cartItemId: string) => void
  updateItemInstructions: (cartItemId: string, instructions: string) => void
  clearCart: () => void
  
  // Computations
  getTotalCount: () => number
  getBreakdown: () => BillBreakdown
}

function getStoredCartState() {
  try {
    const raw = localStorage.getItem('dineflow_cart_store')
    if (raw) {
      const parsed = JSON.parse(raw)
      const st = parsed?.state
      if (st && Array.isArray(st.items)) {
        return {
          items: st.items,
          tableNumber: st.tableNumber || '',
        }
      }
    }
  } catch {}
  return { items: [], tableNumber: '' }
}

const initialCart = getStoredCartState()

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: initialCart.items,
      tableNumber: initialCart.tableNumber,
      isDrawerOpen: false,

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
      setTableNumber: (tableNumber: string) => set({ tableNumber }),

      addItem: (food, customizations, quantity, instructions) => {
        const sortedCustIds = [...customizations]
          .map((c) => `${c.groupId}-${c.optionId}`)
          .sort()
          .join('|')
        
        const cleanInstructions = instructions?.trim() || ''
        const cartItemId = `${food.id}::${sortedCustIds}::${cleanInstructions}`

        const extraCost = customizations.reduce((acc, curr) => acc + curr.price, 0)
        const unitPrice = food.price + extraCost

        set((state) => {
          const existingIndex = state.items.findIndex((item) => item.cartItemId === cartItemId)
          if (existingIndex > -1) {
            const updated = [...state.items]
            const newQty = updated[existingIndex].quantity + quantity
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: newQty,
              lineTotal: newQty * unitPrice,
            }
            return { items: updated }
          } else {
            const newItem: CartItem = {
              cartItemId,
              foodItem: food,
              quantity,
              selectedCustomizations: customizations,
              specialInstructions: cleanInstructions,
              unitPriceWithCustomizations: unitPrice,
              lineTotal: unitPrice * quantity,
            }
            return { items: [...state.items, newItem] }
          }
        })
      },

      updateQuantity: (cartItemId, newQuantity) => {
        if (newQuantity <= 0) {
          get().removeItem(cartItemId)
          return
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  quantity: newQuantity,
                  lineTotal: item.unitPriceWithCustomizations * newQuantity,
                }
              : item
          ),
        }))
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        }))
      },

      updateItemInstructions: (cartItemId, instructions) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, specialInstructions: instructions }
              : item
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getTotalCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getBreakdown: () => {
        const subtotal = get().items.reduce((total, item) => total + item.lineTotal, 0)
        // 5% GST total: 2.5% CGST + 2.5% SGST
        const cgst = Math.round(subtotal * 0.025)
        const sgst = Math.round(subtotal * 0.025)
        const gstTotal = cgst + sgst
        // 5% Service charge
        const serviceCharge = Math.round(subtotal * 0.05)
        const finalTotal = subtotal + gstTotal + serviceCharge

        return {
          subtotal,
          cgst,
          sgst,
          gstTotal,
          serviceCharge,
          finalTotal,
        }
      },
    }),
    {
      name: 'dineflow_cart_store',
      partialize: (state) => ({ items: state.items, tableNumber: state.tableNumber }),
    }
  )
)

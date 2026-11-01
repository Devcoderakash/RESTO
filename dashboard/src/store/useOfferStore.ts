import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Coupon } from '../types'

interface OfferState {
  coupons: Coupon[]
  filterStatus: 'ALL' | 'ACTIVE' | 'EXPIRED'
  searchQuery: string
  selectedCoupon: Coupon | null
  setFilterStatus: (status: 'ALL' | 'ACTIVE' | 'EXPIRED') => void
  setSearchQuery: (query: string) => void
  setSelectedCoupon: (coupon: Coupon | null) => void
  addCoupon: (coupon: Omit<Coupon, 'id' | 'timesUsed'>) => void
  updateCoupon: (id: string, updates: Partial<Coupon>) => void
  toggleCoupon: (id: string) => void
  deleteCoupon: (id: string) => void
  resetCoupons: () => void
}

export const useOfferStore = create<OfferState>()(
  persist(
    (set) => ({
      coupons: [],
      filterStatus: 'ALL',
      searchQuery: '',
      selectedCoupon: null,
      setFilterStatus: (status) => set({ filterStatus: status }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCoupon: (coupon) => set({ selectedCoupon: coupon }),
      addCoupon: (couponData) => {
        const id = `cpn-${Date.now()}`
        const newCoupon: Coupon = {
          ...couponData,
          id,
          timesUsed: 0,
        }
        set((state) => ({
          coupons: [newCoupon, ...state.coupons],
        }))
      },
      updateCoupon: (id, updates) => {
        set((state) => ({
          coupons: state.coupons.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          selectedCoupon:
            state.selectedCoupon?.id === id ? { ...state.selectedCoupon, ...updates } : state.selectedCoupon,
        }))
      },
      toggleCoupon: (id) => {
        set((state) => ({
          coupons: state.coupons.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)),
        }))
      },
      deleteCoupon: (id) => {
        set((state) => ({
          coupons: state.coupons.filter((c) => c.id !== id),
          selectedCoupon: state.selectedCoupon?.id === id ? null : state.selectedCoupon,
        }))
      },
      resetCoupons: () => set({ coupons: [], selectedCoupon: null }),
    }),
    {
      name: 'dineflow_offers_store',
    }
  )
)


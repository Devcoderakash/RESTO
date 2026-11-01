import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RestaurantSettings } from '../types'
import { initialRestaurantSettings } from '../data/initialData'

export interface RestaurantLocation {
  id: string
  name: string
  branch: string
  address: string
  isActive: boolean
}

export const availableBranches: RestaurantLocation[] = [
  {
    id: 'restaurant',
    name: 'Olive & Ember',
    branch: 'Restaurant',
    address: '',
    isActive: true,
  },
]

interface RestaurantState {
  currentBranchId: string
  branches: RestaurantLocation[]
  settings: RestaurantSettings
  switchBranch: (branchId: string) => void
  updateProfile: (profile: Partial<RestaurantSettings['profile']>) => void
  updateWifi: (wifi: Partial<RestaurantSettings['wifi']>) => void
  updateBilling: (billing: Partial<RestaurantSettings['billing']>) => void
  updateOrderPreferences: (preferences: Partial<RestaurantSettings['orderPreferences']>) => void
  updateNotifications: (notifications: Partial<RestaurantSettings['notifications']>) => void
  resetToDefault: () => void
}

export const useRestaurantStore = create<RestaurantState>()(
  persist(
    (set) => ({
      currentBranchId: 'restaurant',
      branches: availableBranches,
      settings: initialRestaurantSettings,
      switchBranch: (branchId) =>
        set((state) => ({
          currentBranchId: branchId,
          branches: state.branches.map((b) => ({
            ...b,
            isActive: b.id === branchId,
          })),
        })),
      updateProfile: (profile) =>
        set((state) => ({
          settings: {
            ...state.settings,
            profile: { ...state.settings.profile, ...profile },
          },
        })),
      updateWifi: (wifi) =>
        set((state) => ({
          settings: {
            ...state.settings,
            wifi: { ...state.settings.wifi, ...wifi },
          },
        })),
      updateBilling: (billing) =>
        set((state) => ({
          settings: {
            ...state.settings,
            billing: { ...state.settings.billing, ...billing },
          },
        })),
      updateOrderPreferences: (orderPreferences) =>
        set((state) => ({
          settings: {
            ...state.settings,
            orderPreferences: { ...state.settings.orderPreferences, ...orderPreferences },
          },
        })),
      updateNotifications: (notifications) =>
        set((state) => ({
          settings: {
            ...state.settings,
            notifications: { ...state.settings.notifications, ...notifications },
          },
        })),
      resetToDefault: () =>
        set({
          settings: initialRestaurantSettings,
          branches: availableBranches,
          currentBranchId: 'rest-1',
        }),
    }),
    {
      name: 'dineflow_restaurant_store',
    }
  )
)

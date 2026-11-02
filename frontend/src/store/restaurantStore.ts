import { create } from 'zustand'
import { getRestaurantInfo, RestaurantDetails } from '../services/api'

interface RestaurantState {
  info: RestaurantDetails | null
  isLoading: boolean
  error: string | null
  fetchInfo: () => Promise<void>
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  info: null,
  isLoading: false,
  error: null,
  fetchInfo: async () => {
    set({ isLoading: true })
    try {
      const data = await getRestaurantInfo()
      set({ info: data, error: null, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load restaurant', isLoading: false })
    }
  },
}))


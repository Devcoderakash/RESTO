import { create } from 'zustand'
import { getRestaurantInfo, RestaurantDetails } from '../services/api'

interface RestaurantState {
  info: RestaurantDetails | null
  isLoading: boolean
  error: string | null
  fetchInfo: () => Promise<void>
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  info: {
    id: 'rest-olive-ember-01',
    name: 'The Olive & Ember',
    slug: 'olive-and-ember',
    description: 'Artisanal Mediterranean & Wood-Fired Hearth Dining',
    address: '14 Wood Street, Indiranagar, Bengaluru',
    phone: '+91 80 4123 4567',
    email: 'contact@oliveandember.com',
    wifiSsid: 'OliveEmber-Guest',
    wifiPassword: 'FiredWood2026',
    taxPercentage: 5,
    serviceChargePercentage: 0,
    currency: 'INR',
  },
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


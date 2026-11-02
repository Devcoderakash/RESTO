import { create } from 'zustand'
import { dashboardApi } from '../services/api'
import { useMenuStore } from './useMenuStore'
import { useOrderStore } from './useOrderStore'
import { useRestaurantStore } from './useRestaurantStore'
import { useTableStore } from './useTableStore'
import { useWaiterRequestStore } from './useWaiterRequestStore'
import { usePaymentStore } from './usePaymentStore'

interface DashboardDataState {
  isLoading: boolean
  hasLoaded: boolean
  error: string | null
  restaurant: any | null
  overview: Record<string, any> | null
  dailySales: Array<{ date: string; total: number }>
  loadDashboard: () => Promise<void>
  refreshLiveData: () => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load dashboard data.'
}

async function loadLiveData() {
  const results = await Promise.allSettled([
    dashboardApi.getOrders(),
    dashboardApi.getTables(),
    dashboardApi.getServiceRequests(),
    dashboardApi.getOverview(),
    dashboardApi.getPayments(),
    dashboardApi.getDailySales(),
  ])
  const errors: string[] = []
  const [orders, tables, requests, overview, payments, dailySales] = results

  if (orders.status === 'fulfilled') useOrderStore.setState({ orders: orders.value })
  else errors.push(`Orders: ${getErrorMessage(orders.reason)}`)

  if (tables.status === 'fulfilled') useTableStore.setState({ tables: tables.value })
  else errors.push(`Tables: ${getErrorMessage(tables.reason)}`)

  if (requests.status === 'fulfilled') {
    useWaiterRequestStore.getState().setRequests({
      tableRequests: requests.value.tableRequests,
      billRequests: requests.value.billRequests,
    })
  } else errors.push(`Service requests: ${getErrorMessage(requests.reason)}`)

  if (overview.status === 'fulfilled') useDashboardDataStore.setState({ overview: overview.value })
  else errors.push(`Overview: ${getErrorMessage(overview.reason)}`)

  if (payments.status === 'fulfilled') {
    usePaymentStore.setState({ transactions: payments.value })
  } else {
    console.warn('Payments load non-fatal warning:', payments.reason)
  }

  if (dailySales.status === 'fulfilled') useDashboardDataStore.setState({ dailySales: dailySales.value })
  else errors.push(`Daily sales: ${getErrorMessage(dailySales.reason)}`)

  return errors
}

export const useDashboardDataStore = create<DashboardDataState>((set) => ({
  isLoading: false,
  hasLoaded: false,
  error: null,
  restaurant: null,
  overview: null,
  dailySales: [],
  loadDashboard: async () => {
    set({ isLoading: true })
    const [restaurantResult, menuResult, liveErrors] = await Promise.all([
      dashboardApi.getRestaurant().then((data) => ({ data })).catch((error: unknown) => ({ error })),
      dashboardApi.getMenu().then((data) => ({ data })).catch((error: unknown) => ({ error })),
      loadLiveData(),
    ])

    const errors = [...liveErrors]
    if ('data' in restaurantResult) {
      const restaurant = restaurantResult.data?.restaurant ?? restaurantResult.data
      set({ restaurant })
      const name = restaurant?.name ?? restaurant?.restaurantName ?? restaurant?.restaurant_name
      if (name) {
        useRestaurantStore.setState((state) => ({
          currentBranchId: 'restaurant',
          branches: [{
            id: 'restaurant',
            name,
            branch: restaurant.branch ?? restaurant.address ?? 'Restaurant',
            address: restaurant.address ?? '',
            isActive: true,
          }],
          settings: {
            ...state.settings,
            profile: {
              ...state.settings.profile,
              name,
              description: restaurant.description ?? state.settings.profile.description,
              address: restaurant.address ?? state.settings.profile.address,
              phone: restaurant.phone ?? state.settings.profile.phone,
              email: restaurant.email ?? state.settings.profile.email,
              logo: restaurant.logo_url ?? state.settings.profile.logo,
            },
            wifi: {
              ...state.settings.wifi,
              networkName: restaurant.wifi_ssid ?? '',
              password: restaurant.wifi_password ?? '',
            },
            billing: {
              ...state.settings.billing,
              taxPercentage: Number(restaurant.tax_percentage ?? 0),
              serviceChargePercentage: Number(restaurant.service_charge_percentage ?? 0),
            },
          },
        }))
      }
    } else errors.push(`Restaurant: ${getErrorMessage(restaurantResult.error)}`)

    if ('data' in menuResult) {
      useMenuStore.getState().setMenu(menuResult.data.items, menuResult.data.categories)
    } else errors.push(`Menu: ${getErrorMessage(menuResult.error)}`)

    set({
      isLoading: false,
      hasLoaded: true,
      error: errors.length ? errors.join(' ') : null,
    })
  },
  refreshLiveData: async () => {
    const errors = await loadLiveData()
    set({ error: errors.length ? errors.join(' ') : null })
  },
}))

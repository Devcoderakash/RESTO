import { CartItem } from '../types/cart'
import { FoodItem, MenuCategory } from '../types/menu'
import { Order, PaymentMethod, ServiceRequestType } from '../types/order'

function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || 'https://resto-vc53.onrender.com/api'
  let cleanUrl = envUrl.replace(/\/+$/, '')
  if (!cleanUrl.endsWith('/api')) {
    cleanUrl = `${cleanUrl}/api`
  }
  return cleanUrl
}

const API_URL = getApiUrl()
export const RESTAURANT_SLUG = import.meta.env.VITE_RESTAURANT_SLUG || 'olive-and-ember'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  const responseText = await response.text()
  let body: unknown
  if (responseText) {
    try {
      body = JSON.parse(responseText)
    } catch {
      if (response.ok) throw new ApiError('The server returned an invalid response.', response.status)
      body = { message: responseText }
    }
  }
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
        ? body.message
        : typeof body === 'object' && body !== null && 'error' in body &&
            typeof body.error === 'object' && body.error !== null && 'message' in body.error &&
            typeof body.error.message === 'string'
          ? body.error.message
          : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  if (typeof body === 'object' && body !== null && 'data' in body) {
    return body.data as T
  }
  return body as T
}

export interface ApiTable {
  number: string
  capacity: number
  zone?: string
  status: string
}

export interface MenuResponse {
  items: FoodItem[]
  categories: MenuCategory[]
}

export interface CreateOrderResponse extends Order {
  trackingToken?: string
  accessToken?: string
}

export interface RestaurantDetails {
  id: string
  name: string
  slug: string
  description?: string
  address?: string
  phone?: string
  email?: string
  wifiSsid?: string
  wifiPassword?: string
  taxPercentage?: number
  serviceChargePercentage?: number
  currency?: string
}

export function getRestaurantInfo(): Promise<RestaurantDetails> {
  return request<any>(`/restaurants/info?slug=${encodeURIComponent(RESTAURANT_SLUG)}`).then((data) => ({
    id: String(data.id || ''),
    name: String(data.name || 'The Olive & Ember'),
    slug: String(data.slug || RESTAURANT_SLUG),
    description: data.description,
    address: data.address,
    phone: data.phone,
    email: data.email,
    wifiSsid: data.wifi_ssid || data.wifiSsid || 'OliveEmber-Guest',
    wifiPassword: data.wifi_password || data.wifiPassword || 'FiredWood2026',
    taxPercentage: Number(data.tax_percentage ?? 5),
    serviceChargePercentage: Number(data.service_charge_percentage ?? 0),
    currency: data.currency || 'INR',
  }))
}

export function getAvailableTables(): Promise<ApiTable[] | { tables: ApiTable[] }> {
  return request<ApiTable[] | { tables: ApiTable[] }>(`/tables/availability?restaurantSlug=${encodeURIComponent(RESTAURANT_SLUG)}`)
}

export function getMenu(): Promise<MenuResponse> {
  return request<MenuResponse>(`/menu?restaurantSlug=${encodeURIComponent(RESTAURANT_SLUG)}`)
}

export interface CreateOrderInput {
  tableNumber: string
  customerName?: string
  customerPhone?: string
  items: CartItem[]
  paymentMethod: PaymentMethod
  specialInstructions?: string
  idempotencyKey: string
}

export function createCustomerOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
  return request('/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify({
      restaurantSlug: RESTAURANT_SLUG,
      tableNumber: input.tableNumber,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      paymentMethod: input.paymentMethod,
      specialInstructions: input.specialInstructions,
      idempotencyKey: input.idempotencyKey,
      items: input.items.map((item) => ({
        menuItemId: item.foodItem.id,
        quantity: item.quantity,
        selectedAddons: item.selectedCustomizations.map((customization) => ({
          id: customization.optionId,
          name: customization.optionName,
        })),
        specialInstructions: item.specialInstructions,
      })),
    }),
  })
}

export function getTrackedOrder(orderId: string): Promise<Order> {
  const token = sessionStorage.getItem(`order-tracking:${orderId}`)
  const suffix = token ? `?accessToken=${encodeURIComponent(token)}` : ''
  return request(`/orders/${encodeURIComponent(orderId)}/tracking${suffix}`)
}

export async function createServiceRequest(input: {
  tableNumber: string
  type: 'call_waiter' | 'request_bill'
  detail?: ServiceRequestType | string
  note?: string
  paymentPreference?: string
}): Promise<void> {
  const requestType =
    input.type === 'request_bill'
      ? 'bill'
      : input.detail === 'Request Water'
        ? 'water'
        : input.detail === 'Need Assistance'
          ? 'assistance'
          : 'waiter'
  await request('/service-requests', {
    method: 'POST',
    body: JSON.stringify({
      restaurantSlug: RESTAURANT_SLUG,
      tableNumber: input.tableNumber,
      requestType,
      message: input.note || input.detail,
      paymentPreference: input.paymentPreference,
    }),
  })
}

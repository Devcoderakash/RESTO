import { Category, MenuItem, Order, OrderStatus, PaymentTransaction, StaffMember, Table } from '../types'
import { BillRequest, TableRequest } from '../store/useWaiterRequestStore'

export const restaurantSlug = import.meta.env.VITE_RESTAURANT_SLUG || 'olive-and-ember'
const DEFAULT_STAFF_TOKEN = 'demo-staff-token-manager'
const DEFAULT_STAFF_EMAIL = 'contact@oliveandember.com'

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || 'https://resto-vc53.onrender.com/api'
  let cleanUrl = envUrl.replace(/\/+$/, '')
  if (!cleanUrl.endsWith('/api')) {
    cleanUrl = `${cleanUrl}/api`
  }
  return cleanUrl
}

export const apiBaseUrl = getApiBaseUrl()
const AUTH_TOKEN_KEY = 'resto_access_token'
const AUTH_EMAIL_KEY = 'resto_staff_email'
export const AUTH_CHANGE_EVENT = 'resto:auth-change'

export interface DashboardOverview {
  todayRevenue?: number
  totalOrders?: number
  activeTables?: number
  totalTables?: number
  averageOrderValue?: number
  pendingOrders?: number
  currency?: string
  [key: string]: unknown
}

function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || DEFAULT_STAFF_TOKEN
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      'X-Staff-Internal': 'true',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    let message = body || `API request failed (${response.status} ${response.statusText})`
    try {
      const parsed = JSON.parse(body)
      message = parsed?.error?.message ?? parsed?.message ?? message
    } catch {
      // Keep plain-text API errors readable.
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function unwrap(value: any): any {
  return value?.data ?? value
}

function listFrom(value: any, ...keys: string[]): any[] {
  const result = unwrap(value)
  if (Array.isArray(result)) return result
  for (const key of keys) {
    if (Array.isArray(result?.[key])) return result[key]
  }
  return []
}

const valueOf = (value: any, ...keys: string[]) => {
  for (const key of keys) {
    if (value?.[key] !== undefined && value[key] !== null) return value[key]
  }
  return undefined
}

function normalizeOrder(source: any): Order {
  const items = valueOf(source, 'items', 'orderItems', 'order_items') ?? []
  const rawStatus = String(valueOf(source, 'orderStatus', 'order_status', 'status') ?? 'pending').toLowerCase()
  const orderStatus: OrderStatus = ({
    pending: 'New',
    confirmed: 'Accepted',
    preparing: 'Preparing',
    ready: 'Ready',
    served: 'Served',
    completed: 'Completed',
    cancelled: 'Cancelled',
  } as Record<string, OrderStatus>)[rawStatus] ?? 'New'
  const rawPaymentStatus = String(valueOf(source, 'paymentStatus', 'payment_status') ?? 'pending').toLowerCase()
  const paymentStatus = ({
    pending: 'Pending',
    completed: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  } as const)[rawPaymentStatus as 'pending' | 'completed' | 'failed' | 'refunded'] ?? 'Pending'
  const rawPaymentMethod = String(valueOf(source, 'paymentMethod', 'payment_method') ?? 'counter').toLowerCase()
  const paymentMethod = rawPaymentMethod === 'upi' ? 'UPI' : rawPaymentMethod === 'card' ? 'Card' : rawPaymentMethod === 'online' ? 'Online' : 'Cash'
  return {
    id: String(valueOf(source, 'id', 'orderId', 'order_id')),
    tableNumber: String(valueOf(source, 'tableNumber', 'table_number', 'table')?.tableNumber
      ?? valueOf(source, 'tableNumber', 'table_number', 'table') ?? ''),
    customerName: String(valueOf(source, 'customerName', 'customer_name', 'name') ?? 'Guest'),
    customerPhone: valueOf(source, 'customerPhone', 'customer_phone', 'phone'),
    items: items.map((item: any, index: number) => ({
      id: String(valueOf(item, 'id') ?? `${source.id}-item-${index}`),
      menuItemId: String(valueOf(item, 'menuItemId', 'menu_item_id') ?? ''),
      name: String(valueOf(item, 'name', 'item_name', 'menuItemName', 'menu_item_name') ?? 'Item'),
      price: Number(valueOf(item, 'price', 'unitPrice', 'unit_price') ?? 0),
      quantity: Number(valueOf(item, 'quantity', 'qty') ?? 1),
      selectedOptions: valueOf(item, 'selectedOptions', 'selected_options', 'selected_addons')?.map((option: any) => option.name ?? option) ?? [],
      notes: valueOf(item, 'notes'),
      isVeg: Boolean(valueOf(item, 'isVeg', 'is_veg') ?? item.food_type === 'veg'),
    })),
    subtotal: Number(valueOf(source, 'subtotal', 'sub_total') ?? 0),
    tax: Number(valueOf(source, 'tax', 'taxAmount', 'tax_amount', 'gst_total') ?? 0),
    serviceCharge: Number(valueOf(source, 'serviceCharge', 'service_charge') ?? 0),
    discount: Number(valueOf(source, 'discount') ?? 0),
    total: Number(valueOf(source, 'total', 'totalAmount', 'total_amount', 'final_total') ?? 0),
    paymentStatus,
    paymentMethod,
    orderStatus,
    createdAt: String(valueOf(source, 'createdAt', 'created_at') ?? ''),
    updatedAt: String(valueOf(source, 'updatedAt', 'updated_at') ?? ''),
    specialInstructions: valueOf(source, 'specialInstructions', 'special_instructions'),
    cancelledReason: valueOf(source, 'cancelledReason', 'cancelled_reason', 'cancellation_reason'),
  }
}

function normalizeTable(source: any): Table {
  const number = valueOf(source, 'tableNumber', 'table_number', 'number') ?? source.id
  return {
    id: String(source.id),
    tableNumber: String(number).padStart(2, '0'),
    capacity: Number(valueOf(source, 'capacity', 'seats') ?? 0),
    zone: valueOf(source, 'zone', 'area') ?? 'Main Dining',
    status: ({
      available: 'Available',
      occupied: 'Occupied',
      inactive: 'Cleaning',
    } as Record<string, Table['status']>)[String(valueOf(source, 'status', 'tableStatus', 'table_status') ?? 'available').toLowerCase()] ?? 'Available',
    currentOrderId: valueOf(source, 'currentOrderId', 'current_order_id'),
    currentBill: valueOf(source, 'currentBill', 'current_bill'),
    sessionStartedAt: valueOf(source, 'sessionStartedAt', 'session_started_at'),
    activeGuestsCount: valueOf(source, 'activeGuestsCount', 'active_guests_count'),
    qrUrl: valueOf(source, 'qrUrl', 'qr_url', 'qr_code_url') ?? `/menu?table=${String(number).padStart(2, '0')}`,
  }
}

function normalizeMenuItem(source: any): MenuItem {
  const category = valueOf(source, 'category', 'categories')
  return {
    id: String(source.id),
    name: String(source.name ?? ''),
    description: String(source.description ?? ''),
    price: Number(source.price ?? 0),
    categoryId: String(valueOf(source, 'categoryId', 'category_id') ?? category?.id ?? ''),
    categoryName: String(valueOf(source, 'categoryName', 'category_name') ?? category?.name ?? ''),
    isVeg: Boolean(valueOf(source, 'isVeg', 'is_veg') ?? (source.foodType === 'veg' || source.food_type === 'veg')),
    isAvailable: Boolean(valueOf(source, 'isAvailable', 'is_available', 'available') ?? true),
    imageUrl: valueOf(source, 'imageUrl', 'image_url') ?? '',
    isPopular: Boolean(valueOf(source, 'popular', 'isPopular', 'is_popular') ?? false),
    prepTimeMinutes: Number(valueOf(source, 'prepTimeMinutes', 'preparation_time_minutes', 'preparationTimeMinutes') ?? 15),
    calories: valueOf(source, 'calories'),
    allergens: valueOf(source, 'allergens') ?? [],
    createdAt: String(valueOf(source, 'createdAt', 'created_at') ?? ''),
  }
}

function normalizeCategory(source: any): Category {
  return {
    id: String(source.id),
    name: String(source.name ?? ''),
    slug: String(valueOf(source, 'slug') ?? (source.name ? String(source.name).toLowerCase().replace(/\s+/g, '-') : '')),
    description: source.description,
    image: valueOf(source, 'image', 'imageUrl', 'image_url'),
    isActive: Boolean(valueOf(source, 'isActive', 'is_visible', 'isVisible') ?? true),
    itemCount: Number(valueOf(source, 'itemCount', 'item_count') ?? 0),
    sortOrder: Number(valueOf(source, 'sortOrder', 'sort_order') ?? 0),
  }
}

function normalizeStaff(source: any): StaffMember {
  const role = String(valueOf(source, 'role') ?? 'manager').toLowerCase()
  return {
    id: String(source.id),
    name: String(valueOf(source, 'name', 'full_name', 'fullName') ?? ''),
    email: String(source.email ?? ''),
    role: role === 'chef' ? 'Chef' : role === 'waiter' ? 'Waiter' : 'Manager',
    phone: String(valueOf(source, 'phone') ?? ''),
    avatar: valueOf(source, 'avatar', 'avatar_url', 'avatarUrl') ?? '',
    status: (valueOf(source, 'status') ?? (source.is_active ? 'Active' : 'Inactive')) as 'Active' | 'Inactive',
    joiningDate: String(valueOf(source, 'joiningDate', 'created_at', 'createdAt') ?? '').slice(0, 10),
    shift: 'Not set',
    permissions: {
      orders: true,
      tables: true,
      menu: role === 'manager',
      billing: role === 'manager',
      reports: role === 'manager',
      settings: role === 'manager',
    },
  }
}

function normalizeServiceRequest(source: any): TableRequest {
  const rawType = String(valueOf(source, 'type', 'requestType', 'request_type') ?? 'waiter').toLowerCase()
  return {
    id: String(source.id),
    tableNumber: String(valueOf(source, 'tableNumber', 'table_number') ?? ''),
    type: rawType.includes('water') ? 'water' : rawType.includes('assistance') ? 'assistance' : 'waiter',
    details: valueOf(source, 'details', 'message') ?? '',
    time: String(valueOf(source, 'time', 'createdAt', 'created_at') ?? ''),
    status: valueOf(source, 'status') ?? 'pending',
  }
}

export const dashboardApi = {
  hasSession(): boolean {
    return true
  },
  getSessionEmail(): string {
    return sessionStorage.getItem(AUTH_EMAIL_KEY) || DEFAULT_STAFF_EMAIL
  },
  async getRestaurant() {
    return unwrap(await request<any>('/staff/restaurant-settings'))
  },
  async getTables(): Promise<Table[]> {
    return listFrom(await request<any>('/tables'), 'tables').map(normalizeTable)
  },
  async getMenu(): Promise<{ items: MenuItem[]; categories: Category[] }> {
    const result = unwrap(await request<any>('/staff/menu'))
    const items = listFrom(result, 'items', 'menuItems', 'menu_items').map(normalizeMenuItem)
    const categories = listFrom(result, 'categories').map(normalizeCategory)
    return { items, categories }
  },
  async getOrders(): Promise<Order[]> {
    return listFrom(await request<any>('/orders'), 'orders').map(normalizeOrder)
  },
  async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<void> {
    const mappedStatus = ({
      New: 'pending',
      Accepted: 'confirmed',
      Preparing: 'preparing',
      Ready: 'ready',
      Served: 'served',
      Completed: 'completed',
      Cancelled: 'cancelled',
    } as const)[status]
    await request(`/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: mappedStatus, ...(reason ? { reason } : {}) }),
    })
  },
  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const result = unwrap(await request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify({ ...order, restaurantSlug }),
    }))
    return normalizeOrder(result?.order ?? result)
  },
  async getServiceRequests(): Promise<{ tableRequests: TableRequest[]; billRequests: BillRequest[] }> {
    const requests = listFrom(
      await request<any>(`/service-requests?restaurantSlug=${encodeURIComponent(restaurantSlug)}`),
      'requests',
      'serviceRequests',
      'service_requests',
    )
    return {
      tableRequests: requests.filter((item) => !String(valueOf(item, 'type', 'requestType', 'request_type') ?? '').toLowerCase().includes('bill'))
        .map(normalizeServiceRequest),
      billRequests: requests.filter((item) => String(valueOf(item, 'type', 'requestType', 'request_type') ?? '').toLowerCase().includes('bill'))
        .map((item) => ({
          id: String(item.id),
          tableNumber: String(valueOf(item, 'tableNumber', 'table_number') ?? ''),
          orderId: valueOf(item, 'orderId', 'order_id'),
          paymentPreference: valueOf(item, 'paymentPreference', 'payment_preference') ?? 'cash',
          amount: Number(item.amount ?? 0),
          time: String(valueOf(item, 'time', 'createdAt', 'created_at') ?? ''),
          status: valueOf(item, 'status') ?? 'pending',
        })),
    }
  },
  async createServiceRequest(requestData: Omit<TableRequest, 'id' | 'status'>): Promise<TableRequest> {
    const result = unwrap(await request<any>('/service-requests', {
      method: 'POST',
      body: JSON.stringify({
        restaurantSlug,
        tableNumber: Number(requestData.tableNumber),
        requestType: requestData.type === 'water' ? 'water' : requestData.type === 'assistance' ? 'assistance' : 'waiter',
        message: requestData.details,
      }),
    }))
    return normalizeServiceRequest(result?.request ?? result)
  },
  async getOverview(): Promise<DashboardOverview> {
    return unwrap(await request<DashboardOverview>('/dashboard/overview'))
  },
  async getDailySales(): Promise<Array<{ date: string; total: number }>> {
    return listFrom(await request<any>('/dashboard/daily-sales'), 'sales')
      .map((sale) => ({ date: String(sale.date), total: Number(sale.total) }))
  },
  async setTableStatus(tableId: string, status: Table['status']): Promise<void> {
    const mappedStatus = status === 'Available' ? 'available' : status === 'Occupied' ? 'occupied' : 'inactive'
    await request(`/tables/${encodeURIComponent(tableId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: mappedStatus }),
    })
  },
  async createTable(input: Omit<Table, 'id' | 'qrUrl'>): Promise<Table> {
    const rawNumber = String(input.tableNumber).trim()
    const result = await request<any>(`/tables?restaurantSlug=${encodeURIComponent(restaurantSlug)}`, {
      method: 'POST',
      body: JSON.stringify({
        tableNumber: rawNumber,
        table_number: rawNumber,
        capacity: Number(input.capacity) || 4,
        zone: input.zone,
        status: input.status === 'Available' ? 'available' : input.status === 'Occupied' ? 'occupied' : 'inactive',
      }),
    })
    return normalizeTable(unwrap(result))
  },
  async updateTable(tableId: string, input: Partial<Table>): Promise<void> {
    if (input.tableNumber !== undefined || input.capacity !== undefined || input.zone !== undefined || input.status !== undefined) {
      const rawNumber = input.tableNumber !== undefined ? String(input.tableNumber).trim() : undefined
      const status = input.status !== undefined
        ? (input.status === 'Available' ? 'available' : input.status === 'Occupied' ? 'occupied' : 'inactive')
        : undefined

      await request(`/tables/${encodeURIComponent(tableId)}?restaurantSlug=${encodeURIComponent(restaurantSlug)}`, {
        method: 'PUT',
        body: JSON.stringify({
          tableNumber: rawNumber,
          table_number: rawNumber,
          capacity: input.capacity !== undefined ? (Number(input.capacity) || 4) : undefined,
          zone: input.zone,
          status,
        }),
      })
      return
    }
    throw new Error('No table changes were provided.')
  },
  async deleteTable(tableId: string): Promise<void> {
    await request(`/tables/${encodeURIComponent(tableId)}`, { method: 'DELETE' })
  },
  async createMenuItem(input: Omit<MenuItem, 'id' | 'createdAt'>): Promise<MenuItem> {
    const result = await request<any>('/staff/menu', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: input.categoryId || null,
        name: input.name,
        description: input.description,
        price: input.price,
        imageUrl: input.imageUrl || null,
        foodType: input.isVeg ? 'veg' : 'non_veg',
        dietaryTags: input.isVeg ? ['vegetarian'] : [],
        popular: input.isPopular,
        preparationTimeMinutes: input.prepTimeMinutes,
        calories: input.calories ?? null,
        allergens: input.allergens ?? [],
        available: input.isAvailable,
        sortOrder: 0,
      }),
    })
    return normalizeMenuItem(unwrap(result))
  },
  async updateMenuItem(itemId: string, input: Partial<MenuItem>): Promise<void> {
    await request(`/menu/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}),
        ...(input.isVeg !== undefined ? { foodType: input.isVeg ? 'veg' : 'non_veg' } : {}),
        ...(input.isVeg !== undefined ? { dietaryTags: input.isVeg ? ['vegetarian'] : [] } : {}),
        ...(input.isPopular !== undefined ? { popular: input.isPopular } : {}),
        ...(input.prepTimeMinutes !== undefined ? { preparationTimeMinutes: input.prepTimeMinutes } : {}),
        ...(input.calories !== undefined ? { calories: input.calories ?? null } : {}),
        ...(input.allergens !== undefined ? { allergens: input.allergens } : {}),
        ...(input.isAvailable !== undefined ? { available: input.isAvailable } : {}),
      }),
    })
  },
  async setMenuItemAvailability(itemId: string, available: boolean): Promise<void> {
    await request(`/menu/${encodeURIComponent(itemId)}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available }),
    })
  },
  async deleteMenuItem(itemId: string): Promise<void> {
    await request(`/menu/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
  },
  async uploadImage(file: File): Promise<{ url: string; path?: string; size?: number }> {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || DEFAULT_STAFF_TOKEN
    const formData = new FormData()
    formData.append('file', file)
    formData.append('restaurantSlug', restaurantSlug)

    const response = await fetch(apiUrl('/upload'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Staff-Internal': 'true',
      },
      body: formData,
    })

    if (!response.ok) {
      const body = await response.text()
      let message = body || `Image upload failed (${response.status})`
      try {
        const parsed = JSON.parse(body)
        message = parsed?.error?.message ?? parsed?.message ?? message
      } catch {}
      throw new Error(message)
    }

    return response.json()
  },
  async createCategory(input: Omit<Category, 'id' | 'itemCount'>): Promise<void> {
    await request('/categories', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? null,
        imageUrl: input.image ?? null,
        sortOrder: input.sortOrder,
        isVisible: input.isActive,
      }),
    })
  },
  async updateCategory(categoryId: string, input: Partial<Category>): Promise<void> {
    await request(`/categories/${encodeURIComponent(categoryId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.image !== undefined ? { imageUrl: input.image } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isVisible: input.isActive } : {}),
      }),
    })
  },
  async deleteCategory(categoryId: string): Promise<void> {
    await request(`/categories/${encodeURIComponent(categoryId)}`, { method: 'DELETE' })
  },
  async updateServiceRequestStatus(requestId: string, status: 'in_progress' | 'completed' | 'cancelled'): Promise<void> {
    await request(`/service-requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  async getPayments(): Promise<PaymentTransaction[]> {
    const parsePayments = (records: any[]): PaymentTransaction[] =>
      records.map((payment: any) => ({
        id: String(payment.id),
        orderId: String(payment.order_id || payment.orderId || ''),
        tableNumber: String(payment.tableNumber || payment.table_number || ''),
        paymentMethod: ({
          upi: 'UPI',
          card: 'Card',
          online: 'Online',
          cash: 'Cash',
          counter: 'Cash',
        } as const)[String(payment.payment_method || payment.paymentMethod || 'cash').toLowerCase() as 'upi' | 'card' | 'online' | 'cash' | 'counter'] ?? 'Cash',
        amount: Number(payment.amount ?? 0),
        tipAmount: 0,
        date: String(payment.created_at || payment.createdAt || ''),
        status: String(payment.payment_status || payment.status || '').toLowerCase() === 'completed'
          ? 'Success'
          : String(payment.payment_status || payment.status || '').toLowerCase() === 'refunded'
            ? 'Refunded'
            : String(payment.payment_status || payment.status || '').toLowerCase() === 'failed'
              ? 'Failed'
              : 'Pending',
        referenceNo: payment.transaction_reference ?? undefined,
      }))

    try {
      const records = listFrom(await request<any>('/payments'), 'payments')
      return parsePayments(records)
    } catch (err) {
      console.warn('Initial payments load failed, retrying once:', err)
      try {
        await new Promise((r) => setTimeout(r, 600))
        const retryRecords = listFrom(await request<any>('/payments'), 'payments')
        return parsePayments(retryRecords)
      } catch (retryErr) {
        console.warn('Payments retry also failed, returning fallback empty list:', retryErr)
        return []
      }
    }
  },
  async getStaff(): Promise<StaffMember[]> {
    return listFrom(await request<any>('/staff'), 'staff').map(normalizeStaff)
  },
  async inviteStaff(staff: Pick<StaffMember, 'name' | 'email' | 'role'>): Promise<StaffMember> {
    const role = staff.role === 'Chef' ? 'chef' : staff.role === 'Waiter' ? 'waiter' : 'manager'
    const result = unwrap(await request<any>('/staff', {
      method: 'POST',
      body: JSON.stringify({ name: staff.name, email: staff.email, role }),
    }))
    return normalizeStaff(result?.staff ?? result)
  },
  async setStaffActive(staffId: string, isActive: boolean): Promise<void> {
    await request(`/staff/${encodeURIComponent(staffId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    })
  },
  async createPayment(orderId: string): Promise<{ id: string }> {
    const payment = unwrap(await request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }))
    return { id: String(payment.id) }
  },
  async updatePaymentStatus(paymentId: string, status: 'completed' | 'refunded'): Promise<void> {
    await request(`/payments/${encodeURIComponent(paymentId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },
  async updateRestaurantSettings(settings: {
    name?: string
    description?: string
    address?: string
    phone?: string
    email?: string
    taxPercentage?: number
    wifiSsid?: string
    wifiPassword?: string
    logoUrl?: string
    serviceChargePercentage?: number
    openingHours?: Record<string, unknown>
  }): Promise<void> {
    await request('/restaurants/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
}

export const api = dashboardApi


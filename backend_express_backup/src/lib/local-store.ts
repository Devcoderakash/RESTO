/**
 * Local Data Store for RESTO Backend
 * Seeded with full restaurant, table, category, and menu data.
 * Powers the real REST API endpoints when Supabase is not configured or in development mode.
 */

export interface LocalRestaurant {
  id: string
  name: string
  slug: string
  description: string
  address: string
  phone: string
  email: string
  opening_hours: Record<string, string>
  wifi_ssid: string
  wifi_password: string
  tax_percentage: number
  service_charge_percentage: number
  currency: string
  timezone: string
  is_active: boolean
  logo_url: string
}

export interface LocalCategory {
  id: string
  restaurant_id: string
  name: string
  description: string
  sort_order: number
  active: boolean
  is_visible: boolean
}

export interface LocalTable {
  id: string
  restaurant_id: string
  table_number: string
  capacity: number
  zone: string
  status: 'available' | 'occupied' | 'inactive'
  qr_code_url?: string
}

export interface LocalMenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string
  price: number
  image_url: string
  food_type: 'veg' | 'non_veg'
  dietary_tags: string[]
  popular: boolean
  chef_special: boolean
  available: boolean
  preparation_time_minutes: number
  addons: Array<{ id: string; name: string; price: number }>
  sort_order: number
}

export interface LocalOrderItem {
  id: string
  order_id: string
  menu_item_id: string
  item_name: string
  food_type: 'veg' | 'non_veg'
  quantity: number
  unit_price: number
  total_price: number
  selected_addons: Array<{ id: string; name: string; price: number }>
  special_instructions?: string | null
}

export interface LocalOrder {
  id: string
  order_number: string
  restaurant_id: string
  table_number: string
  customer_name?: string | null
  customer_phone?: string | null
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
  payment_method: 'counter' | 'upi' | 'card' | 'online'
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  subtotal: number
  cgst: number
  sgst: number
  gst_total: number
  service_charge: number
  final_total: number
  created_at: string
  updated_at: string
  estimated_time_minutes: number
  order_notes?: string | null
  idempotency_key?: string | null
  tracking_token_hash: string
  status_timeline: Array<{ stage: string; timestamp: string }>
  items: LocalOrderItem[]
}

export interface LocalServiceRequest {
  id: string
  restaurant_id: string
  table_number: string
  request_type: 'waiter' | 'water' | 'bill' | 'assistance' | 'other'
  status: 'pending' | 'in_progress' | 'completed'
  order_id?: string | null
  message?: string | null
  payment_preference?: string | null
  created_at: string
  updated_at: string
}

// Global Singleton State
class LocalStore {
  restaurant: LocalRestaurant = {
    id: 'rest-olive-ember-01',
    name: 'The Olive & Ember',
    slug: 'olive-and-ember',
    description: 'Wood-fired Mediterranean and contemporary dining in Bengaluru.',
    address: '14, Wood Street, 100ft Road, Downtown Heritage District, Bengaluru, Karnataka 560038',
    phone: '+91 98765 43210',
    email: 'concierge@oliveandember.com',
    opening_hours: {
      daily: '12:00 PM – 11:30 PM',
      lunch: '12:00 PM – 04:00 PM',
      dinner: '06:30 PM – 11:30 PM',
    },
    wifi_ssid: 'OliveGuest',
    wifi_password: 'welcome2026',
    tax_percentage: 5.0,
    service_charge_percentage: 5.0,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    is_active: true,
    logo_url: '',
  }

  categories: LocalCategory[] = [
    { id: 'cat-1', restaurant_id: 'rest-olive-ember-01', name: 'Starters', description: 'Small plates and wood-fired appetizers', sort_order: 1, active: true, is_visible: true },
    { id: 'cat-2', restaurant_id: 'rest-olive-ember-01', name: 'Main Course', description: 'Slow-roasted meats and ember specialties', sort_order: 2, active: true, is_visible: true },
    { id: 'cat-3', restaurant_id: 'rest-olive-ember-01', name: 'Pizza & Pasta', description: 'Hand-stretched sourdough and fresh pasta', sort_order: 3, active: true, is_visible: true },
    { id: 'cat-4', restaurant_id: 'rest-olive-ember-01', name: 'Beverages', description: 'Artisanal drinks and slow brews', sort_order: 4, active: true, is_visible: true },
    { id: 'cat-5', restaurant_id: 'rest-olive-ember-01', name: 'Desserts', description: 'Desserts from the pastry kitchen', sort_order: 5, active: true, is_visible: true },
  ]

  tables: LocalTable[] = Array.from({ length: 20 }, (_, idx) => {
    const num = idx + 1
    const pad = String(num).padStart(2, '0')
    const zone = num <= 8 ? 'Main Dining' : num <= 14 ? 'Garden Alfresco' : 'Terrace Lounge'
    const capacity = [1, 2, 8, 11, 15, 19].includes(num) ? 2 : [6, 12, 18].includes(num) ? 6 : num === 14 ? 8 : 4
    const status: 'available' | 'occupied' = num === 3 || num === 6 || num === 9 || num === 14 ? 'occupied' : 'available'
    return {
      id: `tbl-${pad}`,
      restaurant_id: 'rest-olive-ember-01',
      table_number: pad,
      capacity,
      zone,
      status,
      qr_code_url: `/menu?table=${pad}`,
    }
  })

  menuItems: LocalMenuItem[] = [
    {
      id: 'item-1',
      restaurant_id: 'rest-olive-ember-01',
      category_id: 'cat-1',
      name: 'Truffle & Wild Mushroom Arancini',
      description: 'Crispy rice croquettes with wild mushrooms, fontina cheese, and truffle emulsion.',
      price: 425.0,
      image_url: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=900&q=80',
      food_type: 'veg',
      dietary_tags: ['vegetarian'],
      popular: true,
      chef_special: true,
      available: true,
      preparation_time_minutes: 16,
      addons: [{ id: 'sharing', name: 'Sharing Plate (4 pcs)', price: 180 }],
      sort_order: 1,
    },
    {
      id: 'item-2',
      restaurant_id: 'rest-olive-ember-01',
      category_id: 'cat-1',
      name: 'Ember Smoked Chicken Skewers',
      description: 'Charcoal-grilled chicken with zaatar, sumac onions, and lemon-tahini crema.',
      price: 545.0,
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&q=80',
      food_type: 'non_veg',
      dietary_tags: [],
      popular: true,
      chef_special: false,
      available: true,
      preparation_time_minutes: 20,
      addons: [{ id: 'extra-skewer', name: 'Extra Skewer', price: 120 }],
      sort_order: 2,
    },
    {
      id: 'item-3',
      restaurant_id: 'rest-olive-ember-01',
      category_id: 'cat-2',
      name: 'Slow-Braised Rosemary Lamb Shank',
      description: 'Slow-braised lamb with rosemary jus, creamy polenta, and charred heirloom carrots.',
      price: 895.0,
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&q=80',
      food_type: 'non_veg',
      dietary_tags: [],
      popular: true,
      chef_special: true,
      available: true,
      preparation_time_minutes: 35,
      addons: [],
      sort_order: 1,
    },
    {
      id: 'item-4',
      restaurant_id: 'rest-olive-ember-01',
      category_id: 'cat-3',
      name: 'Wood-Fired Margherita Pizza',
      description: 'San Marzano tomato base, fresh fior di latte mozzarella, basil, and extra virgin olive oil.',
      price: 595.0,
      image_url: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=900&q=80',
      food_type: 'veg',
      dietary_tags: ['vegetarian'],
      popular: true,
      chef_special: false,
      available: true,
      preparation_time_minutes: 18,
      addons: [{ id: 'extra-cheese', name: 'Extra Buffalo Mozzarella', price: 90 }],
      sort_order: 1,
    },
    {
      id: 'item-5',
      restaurant_id: 'rest-olive-ember-01',
      category_id: 'cat-3',
      name: 'Handmade Truffle Tagliolini',
      description: 'Fresh egg pasta tossed with winter black truffle paste, butter, and 24-month Parmigiano.',
      price: 685.0,
      image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=80',
      food_type: 'veg',
      dietary_tags: ['vegetarian'],
      popular: false,
      chef_special: true,
      available: true,
      preparation_time_minutes: 20,
      addons: [],
      sort_order: 2,
    },
    {
      id: 'item-6',
      restaurant_id: 'rest-olive-ember-01',
      category_id: 'cat-4',
      name: 'Rosemary Citrus Cooler',
      description: 'Hand-pressed citrus juice infused with fresh bruised rosemary, pink peppercorns, and soda.',
      price: 245.0,
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdab4e7806f0?w=900&q=80',
      food_type: 'veg',
      dietary_tags: ['vegetarian'],
      popular: false,
      chef_special: false,
      available: true,
      preparation_time_minutes: 5,
      addons: [],
      sort_order: 1,
    },
    {
      id: 'item-7',
      restaurant_id: 'rest-olive-ember-01',
      category_id: 'cat-5',
      name: 'Dark Chocolate Fondant',
      description: 'Warm molten Valrhona dark chocolate cake served with Madagascar vanilla bean gelato.',
      price: 395.0,
      image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&q=80',
      food_type: 'veg',
      dietary_tags: ['vegetarian'],
      popular: true,
      chef_special: true,
      available: true,
      preparation_time_minutes: 14,
      addons: [],
      sort_order: 1,
    },
  ]

  orders: LocalOrder[] = [
    {
      id: 'ord-seed-01',
      order_number: 'DF-1024',
      restaurant_id: 'rest-olive-ember-01',
      table_number: '06',
      customer_name: 'Marcus Vance',
      status: 'pending',
      payment_method: 'upi',
      payment_status: 'pending',
      subtotal: 1020.0,
      cgst: 25.5,
      sgst: 25.5,
      gst_total: 51.0,
      service_charge: 51.0,
      final_total: 1122.0,
      created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      estimated_time_minutes: 20,
      order_notes: 'Extra crispy crust on pizza, please.',
      tracking_token_hash: 'seed-token-hash-1',
      status_timeline: [
        { stage: 'received', timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString() },
      ],
      items: [
        {
          id: 'oi-1',
          order_id: 'ord-seed-01',
          menu_item_id: 'item-4',
          item_name: 'Wood-Fired Margherita Pizza',
          food_type: 'veg',
          quantity: 1,
          unit_price: 595.0,
          total_price: 595.0,
          selected_addons: [],
        },
        {
          id: 'oi-2',
          order_id: 'ord-seed-01',
          menu_item_id: 'item-1',
          item_name: 'Truffle & Wild Mushroom Arancini',
          food_type: 'veg',
          quantity: 1,
          unit_price: 425.0,
          total_price: 425.0,
          selected_addons: [],
        },
      ],
    },
  ]

  serviceRequests: LocalServiceRequest[] = [
    {
      id: 'req-seed-01',
      restaurant_id: 'rest-olive-ember-01',
      table_number: '04',
      request_type: 'water',
      status: 'pending',
      message: 'Needs fresh drinking water and glasses',
      created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    },
    {
      id: 'req-seed-02',
      restaurant_id: 'rest-olive-ember-01',
      table_number: '02',
      request_type: 'assistance',
      status: 'pending',
      message: 'Calling waiter for table assistance',
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
  ]

  getMenuFormatted() {
    const categoryNameById = new Map(this.categories.map((c) => [c.id, c.name]))
    return {
      items: this.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category: item.category_id ?? 'all',
        categoryId: item.category_id,
        categoryName: categoryNameById.get(item.category_id) ?? 'Uncategorized',
        image: item.image_url ?? '',
        imageUrl: item.image_url ?? '',
        foodType: item.food_type,
        isVeg: item.food_type === 'veg',
        isVegetarian: item.food_type === 'veg',
        dietaryType: item.food_type === 'veg' ? 'veg' : 'non-veg',
        isPopular: item.popular,
        isChefSpecial: item.chef_special,
        isAvailable: item.available,
        prepTimeMinutes: item.preparation_time_minutes,
        preparationTime: `${item.preparation_time_minutes} min`,
        customizationGroups: Array.isArray(item.addons) && item.addons.length > 0 ? [{
          id: 'addons',
          name: 'Add-ons',
          type: 'multiple',
          required: false,
          options: item.addons,
        }] : [],
      })),
      categories: this.categories.map(({ id, name, description }) => ({ id, name, description })),
    }
  }

  getTablesFormatted() {
    return this.tables.map((t) => ({
      id: t.id,
      number: t.table_number,
      table_number: t.table_number,
      capacity: t.capacity,
      zone: t.zone,
      status: t.status,
    }))
  }

  getOrder(id: string) {
    return this.orders.find((o) => o.id === id)
  }

  createOrder(data: {
    restaurantId: string
    tableNumber: string | number
    customerName?: string | null | undefined
    customerPhone?: string | null | undefined
    paymentMethod: 'counter' | 'upi' | 'card' | 'online'
    items: Array<{
      menuItemId: string
      quantity: number
      selectedAddons?: Array<{ id: string; name?: string | undefined; price?: number | undefined }>
      specialInstructions?: string | null | undefined
    }>
    specialInstructions?: string | null | undefined
    idempotencyKey?: string | undefined
    trackingTokenHash: string
  }) {
    const orderNumber = `DF-${1000 + this.orders.length + 1}`
    const orderId = `ord-${Date.now()}`
    let subtotal = 0

    const orderItems: LocalOrderItem[] = data.items.map((item, index) => {
      const menuItem = this.menuItems.find((m) => m.id === item.menuItemId)
      const name = menuItem ? menuItem.name : 'Custom Item'
      const unitPrice = menuItem ? menuItem.price : 250
      const foodType = menuItem ? menuItem.food_type : 'veg'
      const lineTotal = unitPrice * item.quantity
      subtotal += lineTotal

      return {
        id: `oi-${orderId}-${index + 1}`,
        order_id: orderId,
        menu_item_id: item.menuItemId,
        item_name: name,
        food_type: foodType,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: lineTotal,
        selected_addons: (item.selectedAddons || []).map((a) => ({ id: a.id, name: a.name || '', price: a.price || 0 })),
        special_instructions: item.specialInstructions || null,
      }
    })

    const taxRate = this.restaurant.tax_percentage || 5
    const gstTotal = Number(((subtotal * taxRate) / 100).toFixed(2))
    const cgst = Number((gstTotal / 2).toFixed(2))
    const sgst = Number((gstTotal - cgst).toFixed(2))
    const serviceCharge = 0
    const finalTotal = Number((subtotal + gstTotal + serviceCharge).toFixed(2))
    const now = new Date().toISOString()
    const tableNumStr = String(data.tableNumber).padStart(2, '0')

    const newOrder: LocalOrder = {
      id: orderId,
      order_number: orderNumber,
      restaurant_id: data.restaurantId || this.restaurant.id,
      table_number: tableNumStr,
      customer_name: data.customerName || `Guest Table ${tableNumStr}`,
      customer_phone: data.customerPhone || null,
      status: 'pending',
      payment_method: data.paymentMethod,
      payment_status: data.paymentMethod === 'upi' ? 'completed' : 'pending',
      subtotal,
      cgst,
      sgst,
      gst_total: gstTotal,
      service_charge: serviceCharge,
      final_total: finalTotal,
      created_at: now,
      updated_at: now,
      estimated_time_minutes: 20,
      order_notes: data.specialInstructions || null,
      idempotency_key: data.idempotencyKey || null,
      tracking_token_hash: data.trackingTokenHash,
      status_timeline: [
        { stage: 'received', timestamp: now },
      ],
      items: orderItems,
    }

    this.orders.unshift(newOrder)

    // Also mark the table occupied
    const table = this.tables.find((t) => t.table_number === tableNumStr || t.table_number === String(data.tableNumber))
    if (table) {
      table.status = 'occupied'
    }

    return newOrder
  }

  updateOrderStatus(orderId: string, status: string, reason?: string) {
    const order = this.orders.find((o) => o.id === orderId)
    if (!order) return null

    order.status = status as any
    order.updated_at = new Date().toISOString()
    const stageMap: Record<string, string> = {
      pending: 'received',
      confirmed: 'accepted',
      preparing: 'preparing',
      ready: 'ready',
      served: 'served',
      completed: 'completed',
      cancelled: 'cancelled',
    }
    const stage = stageMap[status] || status
    if (!order.status_timeline.some((t) => t.stage === stage)) {
      order.status_timeline.push({ stage, timestamp: order.updated_at })
    }
    if (status === 'completed' || status === 'cancelled') {
      const activeTableOrders = this.orders.filter(
        (o) => o.table_number === order.table_number && o.id !== orderId && o.status !== 'completed' && o.status !== 'cancelled'
      )
      if (activeTableOrders.length === 0) {
        const table = this.tables.find((t) => t.table_number === order.table_number)
        if (table) table.status = 'available'
      }
    }
    return order
  }

  createServiceRequest(data: {
    restaurantId: string
    tableNumber: string
    requestType: 'water' | 'bill' | 'waiter' | 'assistance' | 'other'
    message?: string | null | undefined
  }) {
    const now = new Date().toISOString()
    const newReq: LocalServiceRequest = {
      id: `req-${Date.now()}`,
      restaurant_id: data.restaurantId || this.restaurant.id,
      table_number: String(data.tableNumber),
      request_type: data.requestType,
      status: 'pending',
      message: data.message || `Table ${data.tableNumber} requested ${data.requestType}`,
      created_at: now,
      updated_at: now,
    }
    this.serviceRequests.unshift(newReq)
    return newReq
  }

  updateServiceRequestStatus(id: string, status: 'in_progress' | 'completed' | 'cancelled') {
    const req = this.serviceRequests.find((r) => r.id === id)
    if (!req) return null
    req.status = status as any
    req.updated_at = new Date().toISOString()
    return req
  }

  getDashboardOrders() {
    return this.orders.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      table_number: order.table_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      status: order.status,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      subtotal: order.subtotal,
      gst_total: order.gst_total,
      service_charge: order.service_charge,
      final_total: order.final_total,
      created_at: order.created_at,
      updated_at: order.updated_at,
      order_notes: order.order_notes,
      order_items: order.items.map((i) => ({
        id: i.id,
        menu_item_id: i.menu_item_id,
        item_name: i.item_name,
        food_type: i.food_type,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        selected_addons: i.selected_addons,
        special_instructions: i.special_instructions,
      })),
    }))
  }

  getOverview() {
    const todayRevenue = this.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.final_total, 0)
    const activeTables = this.tables.filter((t) => t.status === 'occupied').length
    const pendingOrders = this.orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length
    return {
      todayRevenue: Math.round(todayRevenue),
      totalOrders: this.orders.length,
      activeTables,
      totalTables: this.tables.length,
      averageOrderValue: this.orders.length > 0 ? Math.round(todayRevenue / this.orders.length) : 0,
      pendingOrders,
    }
  }
}

export const localStore = new LocalStore()

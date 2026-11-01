export type OrderStatus =
  | 'New'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Served'
  | 'Completed'
  | 'Cancelled'

export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded' | 'Failed'

export type PaymentMethod = 'UPI' | 'Cash' | 'Card' | 'Online'

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  selectedOptions?: string[]
  notes?: string
  isVeg: boolean
}

export interface Order {
  id: string // e.g. ORD-2841
  orderNumber?: string
  tableNumber: string // e.g. "04"
  customerName: string
  customerPhone?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  serviceCharge: number
  discount: number
  total: number
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  orderStatus: OrderStatus
  createdAt: string
  updatedAt: string
  specialInstructions?: string
  cancelledReason?: string
}

export type TableStatus =
  | 'Available'
  | 'Occupied'
  | 'Ordering'
  | 'Food Preparing'
  | 'Food Ready'
  | 'Bill Requested'
  | 'Cleaning'

export interface Table {
  id: string
  tableNumber: string // "01", "02"
  capacity: number // 2, 4, 6, 8
  zone: 'Main Dining' | 'Patio & Outdoor' | 'VIP Lounge' | 'Rooftop Terrace'
  status: TableStatus
  currentOrderId?: string
  currentBill?: number
  sessionStartedAt?: string // ISO timestamp
  activeGuestsCount?: number
  qrUrl: string // e.g. "/menu?table=01"
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  image?: string
  itemCount: number
  isActive: boolean
  sortOrder: number
}

export interface MenuItemOption {
  name: string // e.g. "Spice Level"
  choices: { label: string; extraPrice: number }[]
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  categoryName: string
  isVeg: boolean
  isAvailable: boolean
  isPopular: boolean
  prepTimeMinutes: number
  calories?: number
  allergens?: string[]
  imageUrl: string
  options?: MenuItemOption[]
  createdAt: string
}

export type StaffRole = 'Manager' | 'Chef' | 'Waiter'

export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: StaffRole
  avatar: string
  status: 'Active' | 'Inactive' | 'On Leave'
  joiningDate: string
  shift: 'Morning (08:00 - 16:00)' | 'Evening (16:00 - 00:00)' | 'Full Day (10:00 - 22:00)' | 'Not set'
  permissions: {
    orders: boolean
    tables: boolean
    menu: boolean
    billing: boolean
    reports: boolean
    settings: boolean
  }
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  totalOrders: number
  totalSpent: number
  lastVisit: string
  averageRating: number
  loyaltyTier: 'Gold' | 'Silver' | 'Bronze'
  notes?: string
}

export interface PaymentTransaction {
  id: string // TXN-94102
  orderId: string
  tableNumber: string
  paymentMethod: PaymentMethod
  amount: number
  tipAmount: number
  date: string
  status: 'Success' | 'Pending' | 'Failed' | 'Refunded'
  receiptUrl?: string
  referenceNo?: string
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

export interface StockUsageRecord {
  id: string
  date: string
  quantity: number
  type: 'usage' | 'restock' | 'waste'
  note?: string
}

export interface InventoryItem {
  id: string
  name: string
  category: 'Produce' | 'Dairy & Poultry' | 'Meat & Seafood' | 'Spices & Pantry' | 'Beverages & Bar'
  currentStock: number
  minStock: number
  unit: 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'cans' | 'bottles' | 'boxes'
  costPerUnit: number
  status: StockStatus
  lastUpdated: string
  usageHistory: StockUsageRecord[]
}

export interface Coupon {
  id: string
  code: string // e.g. "DINEGOLD20"
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minOrderValue: number
  maxDiscount?: number
  startDate: string
  endDate: string
  usageLimit: number
  timesUsed: number
  isActive: boolean
}

export interface CustomerReview {
  id: string
  customerName: string
  avatar?: string
  rating: number // 1 to 5
  date: string
  comment: string
  orderId: string
  orderedItems: string[]
  foodRating: number
  serviceRating: number
  reply?: {
    text: string
    repliedAt: string
    repliedBy: string
  }
}

export interface RestaurantSettings {
  profile: {
    name: string
    tagline: string
    logo: string
    coverImage: string
    address: string
    phone: string
    email: string
    website: string
    description: string
    cuisineType: string[]
    openingHours: {
      days: string
      open: string
      close: string
    }[]
  }
  wifi: {
    enabled: boolean
    networkName: string
    password: string
    showOnCustomerMenu: boolean
    instructions?: string
  }
  billing: {
    currencySymbol: string
    currencyCode: string
    taxPercentage: number
    serviceChargePercentage: number
    invoicePrefix: string
    taxId: string
  }
  orderPreferences: {
    autoAcceptOrders: boolean
    kitchenBufferTimeMinutes: number
    allowCustomerTableTransfer: boolean
    minOrderAmount: number
    allowSpecialNotes: boolean
  }
  notifications: {
    soundEnabled: boolean
    emailAlerts: boolean
    smsAlerts: boolean
    lowStockThresholdAlerts: boolean
    billRequestAlerts: boolean
  }
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'order' | 'inventory' | 'bill' | 'review' | 'system'
  timestamp: string
  isRead: boolean
  targetUrl?: string
}

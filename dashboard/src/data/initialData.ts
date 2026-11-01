import {
  Order,
  Table,
  MenuItem,
  Category,
  StaffMember,
  Customer,
  PaymentTransaction,
  InventoryItem,
  Coupon,
  CustomerReview,
  RestaurantSettings,
  NotificationItem,
} from '../types'

export const initialRestaurantSettings: RestaurantSettings = {
  profile: {
    name: 'The Olive & Ember',
    tagline: 'Artisanal Mediterranean & Wood-Fired Hearth Dining',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    address: '14 Wood Street, Indiranagar, Bengaluru, Karnataka 560038',
    phone: '+91 80 4123 4567',
    email: 'contact@oliveandember.com',
    website: 'http://localhost:5173',
    description: 'Artisanal Mediterranean and wood-fired hearth dining.',
    cuisineType: ['Mediterranean', 'Wood-Fired Hearth', 'Artisanal Pasta'],
    openingHours: [
      { days: 'Monday – Thursday', open: '12:00 PM', close: '11:30 PM' },
      { days: 'Friday – Saturday', open: '12:00 PM', close: '12:00 AM' },
      { days: 'Sunday', open: '12:00 PM', close: '11:00 PM' },
    ],
  },
  wifi: {
    enabled: true,
    networkName: 'OliveEmber-Guest',
    password: 'FiredWood2026',
    showOnCustomerMenu: true,
    instructions: 'Connect and enjoy high-speed guest Wi-Fi.',
  },
  billing: {
    currencySymbol: '₹',
    currencyCode: 'INR',
    taxPercentage: 5.0,
    serviceChargePercentage: 0.0,
    invoicePrefix: 'DF-',
    taxId: '29AAAAA0000A1Z5',
  },
  orderPreferences: {
    autoAcceptOrders: false,
    kitchenBufferTimeMinutes: 20,
    allowCustomerTableTransfer: true,
    minOrderAmount: 0,
    allowSpecialNotes: true,
  },
  notifications: {
    soundEnabled: true,
    emailAlerts: false,
    smsAlerts: false,
    lowStockThresholdAlerts: false,
    billRequestAlerts: true,
  },
}

export const initialCategories: Category[] = []
export const initialMenuItems: MenuItem[] = []
export const initialTables: Table[] = []
export const initialOrders: Order[] = []
export const initialStaff: StaffMember[] = []
export const initialCustomers: Customer[] = []
export const initialPayments: PaymentTransaction[] = []
export const initialInventory: InventoryItem[] = []
export const initialCoupons: Coupon[] = []
export const initialReviews: CustomerReview[] = []
export const initialNotifications: NotificationItem[] = []

export const mockAnalyticsData = {
  categorySalesShare: [] as { name: string; value: number; fill: string }[],
}

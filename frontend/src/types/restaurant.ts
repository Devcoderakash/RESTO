export interface RestaurantInfo {
  name: string
  tagline: string
  type: string
  description: string
  rating: number
  reviewCount: number
  isOpen: boolean
  openingHours: string
  timingDetails: {
    lunch: string
    dinner: string
  }
  address: {
    line1: string
    area: string
    city: string
    pincode: string
  }
  contact: {
    phone: string
    email: string
    instagram: string
  }
  wifi: {
    network: string
    password: string
    instructions: string
  }
  features: string[]
}

export interface TableContext {
  tableNumber: string
  isScanned: boolean
  guestCount?: number
}

export interface DiningTable {
  number: string
  capacity: number
  zone: 'Main Dining' | 'Garden Alfresco' | 'Terrace Lounge'
  isOccupied: boolean
}

import { CartItem, BillBreakdown } from './cart'

export type OrderStage = 
  | 'received'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled'

export interface OrderTimelineEvent {
  stage: OrderStage
  title: string
  description: string
  timestamp: string
  isCompleted: boolean
  isCurrent: boolean
}

export type PaymentMethod = 'counter' | 'upi'

export interface Order {
  id: string // e.g. "DF-8492"
  tableNumber: string
  customerName?: string
  customerPhone?: string
  items: CartItem[]
  breakdown: BillBreakdown
  paymentMethod: PaymentMethod
  paymentStatus: 'pending' | 'completed'
  status: OrderStage
  createdAt: string
  estimatedTimeMinutes: number
  orderNotes?: string
  statusTimeline: {
    stage: OrderStage
    timestamp: string
  }[]
}

export type ServiceRequestType = 
  | 'Need Assistance'
  | 'Request Water'
  | 'Extra Plates'
  | 'Napkins'
  | 'Cutlery'
  | 'Clean Table'
  | 'Other Request'

export interface ServiceRequest {
  id: string
  tableNumber: string
  type: ServiceRequestType
  message?: string
  timestamp: string
  status: 'pending' | 'acknowledged'
}

export interface BillRequest {
  id: string
  tableNumber: string
  totalAmount: number
  paymentPreference: string
  timestamp: string
  status: 'requested' | 'completed'
}

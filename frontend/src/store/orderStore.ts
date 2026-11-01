import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Order, OrderStage, PaymentMethod, ServiceRequest, ServiceRequestType, BillRequest } from '../types/order'
import { CartItem, BillBreakdown } from '../types/cart'

interface OrderState {
  orders: Order[]
  activeOrderId: string | null
  serviceRequests: ServiceRequest[]
  billRequests: BillRequest[]

  createOrder: (data: {
    tableNumber: string
    customerName?: string
    customerPhone?: string
    items: CartItem[]
    breakdown: BillBreakdown
    paymentMethod: PaymentMethod
    orderNotes?: string
  }) => Order

  getOrder: (id: string) => Order | undefined
  setActiveOrderId: (id: string | null) => void
  advanceOrderStatus: (orderId: string) => void
  resetOrderStatus: (orderId: string) => void
  setOrderStage: (orderId: string, stage: OrderStage) => void

  addServiceRequest: (tableNumber: string, type: ServiceRequestType, message?: string) => ServiceRequest
  addBillRequest: (tableNumber: string, totalAmount: number, paymentPreference: string) => BillRequest
}

const STAGES: OrderStage[] = ['received', 'accepted', 'preparing', 'ready', 'served']

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      activeOrderId: null,
      serviceRequests: [],
      billRequests: [],

      createOrder: (data) => {
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        const orderId = `DF-${randomNum}`
        const now = new Date().toISOString()

        const newOrder: Order = {
          id: orderId,
          tableNumber: data.tableNumber,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          items: data.items,
          breakdown: data.breakdown,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentMethod === 'upi' ? 'completed' : 'pending',
          status: 'received',
          createdAt: now,
          estimatedTimeMinutes: 20,
          orderNotes: data.orderNotes,
          statusTimeline: [
            {
              stage: 'received',
              timestamp: now,
            },
          ],
        }

        set((state) => ({
          orders: [newOrder, ...state.orders],
          activeOrderId: orderId,
        }))

        return newOrder
      },

      getOrder: (id: string) => {
        return get().orders.find((o) => o.id === id)
      },

      setActiveOrderId: (id) => set({ activeOrderId: id }),

      advanceOrderStatus: (orderId: string) => {
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) return order
            const currentIndex = STAGES.indexOf(order.status)
            if (currentIndex < STAGES.length - 1) {
              const nextStage = STAGES[currentIndex + 1]
              const now = new Date().toISOString()
              const alreadyHasStage = order.statusTimeline.some((t) => t.stage === nextStage)
              const updatedTimeline = alreadyHasStage
                ? order.statusTimeline
                : [...order.statusTimeline, { stage: nextStage, timestamp: now }]
              
              return {
                ...order,
                status: nextStage,
                statusTimeline: updatedTimeline,
              }
            }
            return order
          }),
        }))
      },

      resetOrderStatus: (orderId: string) => {
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) return order
            return {
              ...order,
              status: 'received',
              statusTimeline: [{ stage: 'received', timestamp: new Date().toISOString() }],
            }
          }),
        }))
      },

      setOrderStage: (orderId: string, stage: OrderStage) => {
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) return order
            const now = new Date().toISOString()
            const stageIndex = STAGES.indexOf(stage)
            const newTimeline = STAGES.slice(0, stageIndex + 1).map((s) => ({
              stage: s,
              timestamp: now,
            }))
            return {
              ...order,
              status: stage,
              statusTimeline: newTimeline,
            }
          }),
        }))
      },

      addServiceRequest: (tableNumber, type, message) => {
        const newReq: ServiceRequest = {
          id: `req-${Date.now()}`,
          tableNumber,
          type,
          message,
          timestamp: new Date().toISOString(),
          status: 'pending',
        }
        set((state) => ({
          serviceRequests: [newReq, ...state.serviceRequests],
        }))
        return newReq
      },

      addBillRequest: (tableNumber, totalAmount, paymentPreference) => {
        const newBill: BillRequest = {
          id: `bill-${Date.now()}`,
          tableNumber,
          totalAmount,
          paymentPreference,
          timestamp: new Date().toISOString(),
          status: 'requested',
        }
        set((state) => ({
          billRequests: [newBill, ...state.billRequests],
        }))
        return newBill
      },
    }),
    {
      name: 'dineflow_orders_store',
    }
  )
)

import { toast } from 'sonner'
import { useOrderStore } from '../store/useOrderStore'
import { useWaiterRequestStore } from '../store/useWaiterRequestStore'
import { useTableStore } from '../store/useTableStore'
import { restaurantSlug, apiBaseUrl } from './api'
import { Order, OrderStatus } from '../types'

interface RealtimeEventData {
  eventId: number
  eventType: string
  entityType: string
  entityId: string
  payload: any
  createdAt: string
}

class DashboardRealtimeService {
  private eventSource: EventSource | null = null
  private lastEventId: number = 0
  private reconnectTimer: number | null = null
  private isConnecting: boolean = false

  public connect(): () => void {
    if (this.eventSource || this.isConnecting) {
      return () => this.disconnect()
    }

    this.initStream()

    return () => this.disconnect()
  }

  private initStream() {
    this.isConnecting = true
    const url = `${apiBaseUrl}/realtime/stream?restaurantSlug=${encodeURIComponent(
      restaurantSlug
    )}&lastEventId=${this.lastEventId}`

    try {
      this.eventSource = new EventSource(url)

      this.eventSource.onopen = () => {
        this.isConnecting = false
        if (this.reconnectTimer) {
          window.clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
      }

      this.eventSource.onmessage = (event) => {
        try {
          const data: RealtimeEventData = JSON.parse(event.data)
          this.handleEvent(data)
        } catch {
          // Ignore heartbeats and non-JSON frames
        }
      }

      this.eventSource.onerror = () => {
        this.isConnecting = false
        if (this.eventSource) {
          this.eventSource.close()
          this.eventSource = null
        }
        // Automatic exponential backoff reconnection
        if (!this.reconnectTimer) {
          this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null
            this.syncMissedEvents().finally(() => {
              this.initStream()
            })
          }, 3000)
        }
      }
    } catch {
      this.isConnecting = false
    }
  }

  private handleEvent(event: RealtimeEventData) {
    if (event.eventId) {
      this.lastEventId = Math.max(this.lastEventId, event.eventId)
    }

    switch (event.eventType) {
      case 'order.created':
        this.onOrderCreated(event.payload)
        break
      case 'order.updated':
        this.onOrderUpdated(event.payload)
        break
      case 'service_request.created':
        this.onServiceRequestCreated(event.payload)
        break
      case 'service_request.updated':
        this.onServiceRequestUpdated(event.payload)
        break
      default:
        break
    }
  }

  private onOrderCreated(payload: any) {
    if (!payload || !payload.id) return

    const orderStore = useOrderStore.getState()
    const tableStore = useTableStore.getState()

    // Deduplication check
    const exists = orderStore.orders.some((o) => o.id === payload.id)
    if (exists) return

    // Transform payload to Order type
    const newOrder: Order = {
      id: payload.id,
      orderNumber: payload.orderNumber || payload.order_number || payload.id,
      tableNumber: payload.tableNumber || payload.table_number,
      customerName: payload.customerName || payload.customer_name || `Table ${payload.tableNumber}`,
      customerPhone: payload.customerPhone || payload.customer_phone,
      orderStatus: (payload.status || payload.orderStatus || 'New') as OrderStatus,
      paymentMethod: (payload.paymentMethod || payload.payment_method || 'Cash') as any,
      paymentStatus: (payload.paymentStatus || payload.payment_status || 'Pending') as any,
      subtotal: Number(payload.subtotal || 0),
      tax: Number(payload.tax || payload.gst_total || 0),
      serviceCharge: Number(payload.service_charge || 0),
      discount: 0,
      total: Number(payload.total || payload.final_total || 0),
      specialInstructions: payload.orderNotes || payload.order_notes,
      items: (payload.items || []).map((it: any) => ({
        id: it.id || it.menuItemId || String(Math.random()),
        menuItemId: it.menuItemId || it.menu_item_id || it.id,
        name: it.name || it.item_name || 'Item',
        price: Number(it.price || it.unit_price || 0),
        quantity: Number(it.quantity || it.qty || 1),
        isVeg: Boolean(it.isVeg || it.is_veg || it.food_type === 'veg'),
      })),
      createdAt: payload.createdAt || payload.created_at || new Date().toISOString(),
      updatedAt: payload.updatedAt || payload.updated_at || new Date().toISOString(),
    }

    // Insert new order at top of list
    useOrderStore.setState((state) => ({
      orders: [newOrder, ...state.orders],
    }))

    // Update table status to occupied
    if (newOrder.tableNumber) {
      const normTable = newOrder.tableNumber.padStart(2, '0')
      useTableStore.setState((state) => ({
        tables: state.tables.map((t) =>
          t.tableNumber === normTable || t.tableNumber === newOrder.tableNumber
            ? { ...t, status: 'Occupied', currentOrderId: newOrder.id }
            : t
        ),
      }))
    }

    // Play visual toast
    toast.success(`New Order #${newOrder.orderNumber} placed for Table ${newOrder.tableNumber}`, {
      description: `${newOrder.items.length} items • ₹${newOrder.total}`,
    })
  }

  private onOrderUpdated(payload: any) {
    if (!payload || !payload.id) return

    const newStatus = (payload.status || payload.orderStatus) as OrderStatus

    useOrderStore.setState((state) => ({
      orders: state.orders.map((o) =>
        o.id === payload.id
          ? {
              ...o,
              orderStatus: newStatus,
              paymentStatus: payload.paymentStatus || payload.payment_status || o.paymentStatus,
              updatedAt: payload.updatedAt || payload.updated_at || o.updatedAt,
            }
          : o
      ),
    }))

    // If order was completed or cancelled, free the table
    if (newStatus === 'Completed' || newStatus === 'Cancelled') {
      const tableNum = payload.tableNumber || payload.table_number
      if (tableNum) {
        const normTable = tableNum.padStart(2, '0')
        useTableStore.setState((state) => ({
          tables: state.tables.map((t) =>
            t.tableNumber === normTable || t.tableNumber === tableNum
              ? { ...t, status: 'Available', currentOrderId: undefined }
              : t
          ),
        }))
      }
    }
  }

  private onServiceRequestCreated(payload: any) {
    if (!payload || !payload.id) return

    const tableReqStore = useWaiterRequestStore.getState()
    const tableNum = payload.tableNumber || payload.table_number || ''
    const reqType = (payload.requestType || payload.request_type || 'waiter').toLowerCase()

    if (reqType === 'bill') {
      const exists = tableReqStore.billRequests.some((b) => b.id === payload.id)
      if (exists) return
      useWaiterRequestStore.setState({
        billRequests: [
          {
            id: payload.id,
            tableNumber: tableNum,
            time: payload.created_at || new Date().toISOString(),
            status: payload.status === 'completed' ? 'completed' : 'pending',
            paymentPreference: (payload.paymentPreference || 'cash') as any,
            amount: Number(payload.amount || 0),
          },
          ...tableReqStore.billRequests,
        ],
      })
      toast.info(`Table ${tableNum} requested physical bill settlement`)
    } else {
      const exists = tableReqStore.tableRequests.some((r) => r.id === payload.id)
      if (exists) return
      useWaiterRequestStore.setState({
        tableRequests: [
          {
            id: payload.id,
            tableNumber: tableNum,
            type: 'waiter',
            details: payload.message || 'Assistance requested',
            time: payload.created_at || new Date().toISOString(),
            status: payload.status === 'completed' ? 'completed' : 'pending',
          },
          ...tableReqStore.tableRequests,
        ],
      })
      toast.warning(`Table ${tableNum} called waiter for service assistance`)
    }
  }

  private onServiceRequestUpdated(payload: any) {
    if (!payload || !payload.id) return

    const newStatus = payload.status === 'completed' ? 'completed' : 'pending'

    useWaiterRequestStore.setState((state) => ({
      tableRequests: state.tableRequests.map((r) =>
        r.id === payload.id ? { ...r, status: newStatus } : r
      ),
      billRequests: state.billRequests.map((b) =>
        b.id === payload.id ? { ...b, status: newStatus } : b
      ),
    }))
  }

  public async syncMissedEvents() {
    try {
      const url = `${apiBaseUrl}/realtime/sync?restaurantSlug=${encodeURIComponent(
        restaurantSlug
      )}&lastEventId=${this.lastEventId}`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.events)) {
        for (const evt of data.events) {
          this.handleEvent(evt)
        }
      }
      if (data.latestEventId) {
        this.lastEventId = Math.max(this.lastEventId, data.latestEventId)
      }
    } catch {
      // Ignore background sync errors
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.isConnecting = false
  }
}

export const dashboardRealtimeService = new DashboardRealtimeService()

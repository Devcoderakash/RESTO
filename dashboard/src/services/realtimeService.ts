import { toast } from 'sonner'
import { useOrderStore } from '../store/useOrderStore'
import { useWaiterRequestStore } from '../store/useWaiterRequestStore'
import { useTableStore } from '../store/useTableStore'
import { useMenuStore } from '../store/useMenuStore'
import { usePaymentStore } from '../store/usePaymentStore'
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
  private abortController: AbortController | null = null
  private lastEventId: number = 0
  private reconnectTimer: number | null = null
  private pollingTimer: number | null = null
  private isConnecting: boolean = false
  private isConnected: boolean = false
  private processedEventIds = new Set<number>()

  // Backoff strategy (2s base, 1.5x factor, 30s ceiling, 0-500ms jitter)
  private currentBackoffMs: number = 2000
  private readonly minBackoffMs: number = 2000
  private readonly maxBackoffMs: number = 30000

  public connect(): () => void {
    if (this.abortController || this.isConnecting) {
      return () => this.disconnect()
    }

    this.initStream()
    return () => this.disconnect()
  }

  private startFallbackPolling() {
    if (this.pollingTimer) return
    this.pollingTimer = window.setInterval(() => {
      if (!this.isConnected) {
        void this.syncMissedEvents()
      }
    }, 15000)
  }

  private stopFallbackPolling() {
    if (this.pollingTimer) {
      window.clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  private async initStream() {
    this.isConnecting = true
    const staffToken = sessionStorage.getItem('resto_access_token') || 'demo-staff-token-manager'
    const url = `${apiBaseUrl}/realtime/stream?restaurantSlug=${encodeURIComponent(
      restaurantSlug
    )}&lastEventId=${this.lastEventId}`

    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'X-Staff-Internal': 'true',
          Accept: 'text/event-stream',
        },
        signal: this.abortController.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`SSE stream failed with status ${response.status}`)
      }

      this.isConnecting = false
      this.isConnected = true
      this.currentBackoffMs = this.minBackoffMs
      this.stopFallbackPolling()

      if (this.reconnectTimer) {
        window.clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          const trimmed = block.trim()
          if (!trimmed || trimmed.startsWith(':')) continue // Skip keep-alive heartbeats

          let eventData = ''
          for (const line of trimmed.split('\n')) {
            if (line.startsWith('data: ')) {
              eventData = line.substring(6).trim()
            }
          }

          if (eventData) {
            try {
              const data: RealtimeEventData = JSON.parse(eventData)
              this.handleEvent(data)
            } catch {
              // Ignore non-JSON frames
            }
          }
        }
      }

      // Normal closure of bounded stream window (safely releases WSGI thread)
      // Immediately schedule transparent seamless reconnect to keep real-time stream live
      this.isConnecting = false
      if (!this.reconnectTimer) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null
          void this.initStream()
        }, 200)
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      this.isConnecting = false
      this.isConnected = false
      this.startFallbackPolling()

      if (this.abortController) {
        this.abortController = null
      }
      if (!this.reconnectTimer) {
        const jitter = Math.floor(Math.random() * 500)
        const delay = this.currentBackoffMs + jitter
        this.currentBackoffMs = Math.min(this.currentBackoffMs * 1.5, this.maxBackoffMs)

        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null
          this.syncMissedEvents().finally(() => {
            this.initStream()
          })
        }, delay)
      }
    }
  }

  private handleEvent(event: RealtimeEventData) {
    if (event.eventId) {
      if (this.processedEventIds.has(event.eventId)) {
        return // Guaranteed zero duplicate execution
      }
      this.processedEventIds.add(event.eventId)
      if (this.processedEventIds.size > 1000) {
        const iter = this.processedEventIds.values()
        for (let i = 0; i < 200; i++) {
          const val = iter.next().value
          if (val !== undefined) this.processedEventIds.delete(val)
        }
      }
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
      case 'table.created':
      case 'table.updated':
      case 'table.deleted':
        void useTableStore.getState().fetchTables()
        break
      case 'menu.created':
      case 'menu.updated':
      case 'menu.deleted':
      case 'category.created':
      case 'category.updated':
      case 'category.deleted':
        void useMenuStore.getState().fetchMenu()
        break
      case 'payment.created':
      case 'payment.updated':
        void usePaymentStore.getState().fetchPayments()
        break
      default:
        break
    }
  }

  private onOrderCreated(payload: any) {
    if (!payload || !payload.id) return

    const incomingOrder: Order = {
      id: String(payload.id),
      orderNumber: payload.orderNumber || payload.order_number || payload.id,
      tableNumber: payload.tableNumber || payload.table_number || '00',
      customerName: payload.customerName || payload.customer_name || 'Guest',
      customerPhone: payload.customerPhone || payload.customer_phone,
      items: (payload.items || payload.order_items || []).map((item: any) => ({
        id: item.id || `oi-${Date.now()}`,
        menuItemId: item.menuItemId || item.menu_item_id || item.id,
        name: item.name || item.item_name || 'Dish',
        isVeg: item.isVeg ?? item.is_veg ?? true,
        price: Number(item.price || item.unit_price || 0),
        quantity: Number(item.quantity || item.qty || 1),
        notes: item.notes || item.special_instructions,
        selectedOptions: item.selectedOptions || item.selected_addons,
      })),
      orderStatus: 'New',
      subtotal: Number(payload.subtotal || 0),
      tax: Number(payload.tax || payload.gst_total || 0),
      serviceCharge: Number(payload.serviceCharge || payload.service_charge || 0),
      discount: Number(payload.discount || 0),
      total: Number(payload.total || payload.final_total || 0),
      paymentMethod: (payload.paymentMethod || payload.payment_method || 'UPI') as any,
      paymentStatus: (payload.paymentStatus || payload.payment_status || 'Pending') as any,
      createdAt: payload.createdAt || payload.created_at || new Date().toISOString(),
      updatedAt: payload.updatedAt || payload.updated_at || new Date().toISOString(),
      specialInstructions: payload.specialInstructions || payload.order_notes,
    }

    useOrderStore.setState((state) => {
      if (state.orders.some((o) => o.id === incomingOrder.id)) return state
      return { orders: [incomingOrder, ...state.orders] }
    })

    toast.info(`New Order #${incomingOrder.orderNumber}`, {
      description: `Table ${incomingOrder.tableNumber} - ${incomingOrder.items.length} dishes`,
    })

    useTableStore.setState((state) => ({
      tables: state.tables.map((t) =>
        t.tableNumber === incomingOrder.tableNumber ? { ...t, status: 'Occupied' } : t
      ),
    }))
  }

  private onOrderUpdated(payload: any) {
    if (!payload || !payload.id) return

    const rawStatus = (payload.status || payload.order_status || '').toLowerCase()
    const mappedStatus: OrderStatus =
      rawStatus === 'confirmed'
        ? 'Accepted'
        : rawStatus === 'preparing'
        ? 'Preparing'
        : rawStatus === 'ready'
        ? 'Ready'
        : rawStatus === 'served'
        ? 'Served'
        : rawStatus === 'completed'
        ? 'Completed'
        : rawStatus === 'cancelled'
        ? 'Cancelled'
        : 'New'

    const incomingItems = payload.items || payload.order_items

    useOrderStore.setState((state) => ({
      orders: state.orders.map((o) => {
        if (o.id !== payload.id) return o
        const updatedItems = incomingItems
          ? incomingItems.map((item: any) => ({
              id: item.id || `oi-${Date.now()}`,
              menuItemId: item.menuItemId || item.menu_item_id || item.id,
              name: item.name || item.item_name || 'Dish',
              isVeg: item.isVeg ?? item.is_veg ?? true,
              price: Number(item.price || item.unit_price || 0),
              quantity: Number(item.quantity || item.qty || 1),
              notes: item.notes || item.special_instructions,
              selectedOptions: item.selectedOptions || item.selected_addons,
            }))
          : o.items

        return {
          ...o,
          orderStatus: mappedStatus,
          paymentStatus: payload.paymentStatus || payload.payment_status || o.paymentStatus,
          items: updatedItems,
          subtotal: payload.subtotal !== undefined ? Number(payload.subtotal) : o.subtotal,
          tax: (payload.tax !== undefined || payload.gst_total !== undefined)
            ? Number(payload.tax ?? payload.gst_total)
            : o.tax,
          total: (payload.total !== undefined || payload.final_total !== undefined)
            ? Number(payload.total ?? payload.final_total)
            : o.total,
          specialInstructions: payload.specialInstructions || payload.order_notes || o.specialInstructions,
          updatedAt: payload.updatedAt || payload.updated_at || new Date().toISOString(),
        }
      }),
    }))

    if (payload.isAddon || payload.is_addon) {
      toast.info(`Dishes Added to Order #${payload.orderNumber || payload.id}`, {
        description: `Table ${payload.tableNumber || '00'} added more dishes. Bill updated.`,
      })
    }

    if (mappedStatus === 'Completed' || mappedStatus === 'Cancelled') {
      const order = useOrderStore.getState().orders.find((o) => o.id === payload.id)
      if (order) {
        void useTableStore.getState().fetchTables()
      }
    }
  }

  private onServiceRequestCreated(payload: any) {
    if (!payload || !payload.id) return

    const isBill = payload.type === 'bill' || payload.request_type === 'bill'
    const tableNum = payload.tableNumber || payload.table_number || '00'

    if (isBill) {
      useWaiterRequestStore.setState((state) => {
        if (state.billRequests.some((b) => b.id === payload.id)) return state
        const timeStr = new Date(payload.createdAt || payload.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return {
          ...state,
          billRequests: [
            {
              id: String(payload.id),
              tableNumber: tableNum,
              orderId: payload.orderId || payload.order_id,
              paymentPreference: ((payload.paymentMethod || payload.payment_method || 'cash').toLowerCase()) as any,
              amount: Number(payload.amount || payload.total || 0),
              time: timeStr,
              status: 'pending' as const,
            },
            ...state.billRequests,
          ],
        }
      })
      toast.warning(`Bill Requested - Table ${tableNum}`)
    } else {
      useWaiterRequestStore.setState((state) => {
        if (state.tableRequests.some((r) => r.id === payload.id)) return state
        const timeStr = new Date(payload.createdAt || payload.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return {
          ...state,
          tableRequests: [
            {
              id: String(payload.id),
              tableNumber: tableNum,
              type: (payload.type || payload.request_type || 'waiter') as any,
              details: payload.notes || payload.details || 'Customer requested assistance',
              time: timeStr,
              status: 'pending' as const,
            },
            ...state.tableRequests,
          ],
        }
      })
      toast.warning(`Waiter Called - Table ${tableNum}`)
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
      const staffToken = sessionStorage.getItem('resto_access_token') || 'demo-staff-token-manager'
      const url = `${apiBaseUrl}/realtime/sync?restaurantSlug=${encodeURIComponent(
        restaurantSlug
      )}&lastEventId=${this.lastEventId}`
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'X-Staff-Internal': 'true',
        },
      })
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
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopFallbackPolling()
    this.isConnecting = false
    this.isConnected = false
  }
}

export const dashboardRealtimeService = new DashboardRealtimeService()

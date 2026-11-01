import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  ChefHat,
  Flame,
  UtensilsCrossed,
  BellRing,
  Receipt,
  Info,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { DietaryBadge } from '../components/menu/DietaryBadge'
import { CallWaiterModal } from '../components/modals/CallWaiterModal'
import { RequestBillModal } from '../components/modals/RequestBillModal'
import { Order, OrderStage } from '../types/order'
import { formatCurrency, formatTime } from '../lib/formatters'
import { getTrackedOrder, getApiUrl, RESTAURANT_SLUG } from '../services/api'

const STAGE_CONFIG: Record<
  OrderStage,
  { title: string; subtitle: string; icon: React.ReactNode; color: string }
> = {
  received: {
    title: 'Order Received',
    subtitle: 'Kitchen ticket queued. Our chef team is preparing ingredients.',
    icon: <Clock className="w-4.5 h-4.5" />,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  accepted: {
    title: 'Order Confirmed',
    subtitle: 'Kitchen reviewed your table order and fired the station ticket.',
    icon: <CheckCircle2 className="w-4.5 h-4.5" />,
    color: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  preparing: {
    title: 'Crafting in Kitchen',
    subtitle: 'Dishes are firing on wood-fired hearths and fresh pasta stations.',
    icon: <Flame className="w-4.5 h-4.5" />,
    color: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  ready: {
    title: 'Ready to Expedite',
    subtitle: 'Plated, inspected, and currently on its way to your table.',
    icon: <ChefHat className="w-4.5 h-4.5" />,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  served: {
    title: 'Served at Your Table',
    subtitle: 'Dishes delivered. Enjoy your meal! Please call if you need anything.',
    icon: <UtensilsCrossed className="w-4.5 h-4.5" />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  completed: {
    title: 'Dining Completed',
    subtitle: 'Thank you for dining with us at The Olive & Ember.',
    icon: <CheckCircle2 className="w-4.5 h-4.5" />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  cancelled: {
    title: 'Order Cancelled',
    subtitle: 'This ticket was cancelled. Please request table staff if needed.',
    icon: <AlertCircle className="w-4.5 h-4.5" />,
    color: 'text-rose-700 bg-rose-50 border-rose-200',
  },
}

const STAGES: OrderStage[] = ['received', 'accepted', 'preparing', 'ready', 'served']

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder] = useState<Order>()
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false)
  const [isBillModalOpen, setIsBillModalOpen] = useState(false)

  useEffect(() => {
    if (!orderId) return
    let active = true

    // 1. Initial order state load
    getTrackedOrder(orderId)
      .then((latest) => {
        if (active) {
          setOrder(latest)
          setLoadError(null)
          setIsLoading(false)
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load order status.')
          setIsLoading(false)
        }
      })

    // 2. Real-Time SSE stream for instantaneous status transitions (< 50ms)
    let es: EventSource | null = null
    try {
      const trackingToken =
        new URLSearchParams(window.location.search).get('accessToken') ||
        sessionStorage.getItem(`order-tracking:${orderId}`) ||
        ''
      const streamUrl = `${getApiUrl()}/realtime/stream?restaurantSlug=${encodeURIComponent(
        RESTAURANT_SLUG
      )}&orderId=${encodeURIComponent(orderId)}${trackingToken ? `&accessToken=${encodeURIComponent(trackingToken)}` : ''}`

      es = new EventSource(streamUrl)
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.eventType === 'order.updated' && (data.entityId === orderId || !data.entityId)) {
            void getTrackedOrder(orderId).then((fresh) => {
              if (active) setOrder(fresh)
            })
          }
        } catch {
          // Ignore keep-alive heartbeats
        }
      }
    } catch {
      // EventSource fallback handled by timer below
    }

    // 3. Low-frequency safety reconciliation net (every 30s)
    const fallbackTimer = setInterval(() => {
      void getTrackedOrder(orderId).then((fresh) => {
        if (active) setOrder(fresh)
      }).catch(() => {})
    }, 30000)

    return () => {
      active = false
      if (es) es.close()
      clearInterval(fallbackTimer)
    }
  }, [orderId])

  if (!order) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-7 sm:p-8 rounded-3xl border border-beige shadow-soft text-center space-y-4">
          {isLoading ? (
            <Clock className="w-10 h-10 text-gold mx-auto animate-pulse" />
          ) : (
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          )}
          <h2 className="font-serif font-bold text-xl text-charcoal">
            {isLoading ? 'Fetching Order Status' : 'Order Unavailable'}
          </h2>
          <p className="text-xs text-charcoal-600 leading-relaxed">
            {loadError || `Checking order #${orderId} from kitchen records…`}
          </p>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-emerald transition-colors"
          >
            Back to Digital Menu
          </Link>
        </div>
      </div>
    )
  }

  const currentStageIndex =
    order.status === 'completed'
      ? STAGES.length - 1
      : STAGES.indexOf(order.status)
  const isFinished = order.status === 'served' || order.status === 'completed' || order.status === 'cancelled'

  return (
    <div className="min-h-screen bg-canvas text-charcoal pb-20 selection:bg-gold/20 selection:text-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-beige py-3.5 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Digital Menu</span>
          </Link>

          <div className="text-center">
            <h1 className="font-serif font-bold text-base sm:text-lg text-charcoal tracking-tight">
              Order Status Tracker
            </h1>
            <p className="text-[11px] text-charcoal-600 font-mono">
              Ticket #{order.orderNumber || order.id}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-gold-50 text-charcoal border border-gold-300">
              TABLE {order.tableNumber}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6 space-y-5">
        {/* Real-time Indicator banner */}
        <div className="p-3 rounded-xl bg-white/80 border border-beige flex items-center justify-between gap-2 text-xs text-charcoal-600 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live status connected to kitchen • Auto-updating</span>
          </div>
          <span className="text-[10px] text-charcoal-600 font-mono hidden sm:inline">
            Placed {formatTime(order.createdAt)}
          </span>
        </div>

        {/* Current State Hero Card */}
        <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-beige shadow-soft space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600 block">
                Current Kitchen Stage
              </span>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal mt-1 tracking-tight">
                {STAGE_CONFIG[order.status].title}
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-600 mt-1 max-w-lg leading-relaxed">
                {STAGE_CONFIG[order.status].subtitle}
              </p>
            </div>

            {/* Estimated Time Badge */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-cream-50 border border-beige text-center sm:text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-600 block">
                Estimated Delivery
              </span>
              <div className="font-serif font-bold text-xl sm:text-2xl text-charcoal mt-0.5">
                {order.status === 'completed'
                  ? 'Completed'
                  : isFinished
                  ? 'Served'
                  : `~${order.estimatedTimeMinutes} mins`}
              </div>
              <span className="text-[10px] text-charcoal-600 font-medium">
                Table {order.tableNumber}
              </span>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="pt-3">
            <div className="relative">
              {/* Connecting background bar on desktop */}
              <div className="absolute top-5 left-6 right-6 h-1 bg-cream-200 hidden sm:block -z-0" />
              <div
                className="absolute top-5 left-6 h-1 bg-gold transition-all duration-500 hidden sm:block -z-0"
                style={{
                  width: `${(Math.max(currentStageIndex, 0) / (STAGES.length - 1)) * 90}%`,
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 relative z-10">
                {STAGES.map((stageKey, idx) => {
                  const stageInfo = STAGE_CONFIG[stageKey]
                  const isDone = idx < currentStageIndex
                  const isCurrent = idx === currentStageIndex

                  return (
                    <div
                      key={stageKey}
                      className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2"
                    >
                      {/* Step Circle */}
                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-200 shadow-2xs shrink-0 ${
                          isCurrent
                            ? 'bg-charcoal text-white ring-4 ring-gold/25 scale-105'
                            : isDone
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white text-charcoal-600 border border-beige'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        ) : (
                          stageInfo.icon
                        )}
                      </div>

                      {/* Step Text */}
                      <div className="flex-1 sm:flex-initial">
                        <div
                          className={`font-serif font-bold text-xs sm:text-sm leading-tight ${
                            isCurrent
                              ? 'text-charcoal'
                              : isDone
                              ? 'text-emerald-900 font-semibold'
                              : 'text-charcoal-600/70 font-normal'
                          }`}
                        >
                          {stageInfo.title}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Table Service Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setIsWaiterModalOpen(true)}
            className="p-3.5 rounded-2xl bg-white border border-beige hover:border-gold-300 shadow-soft flex items-center justify-center gap-2 text-xs font-semibold text-charcoal hover:bg-cream-50 transition-colors active:scale-98"
          >
            <BellRing className="w-4 h-4 text-gold-700" />
            <span>Call Table Waiter</span>
          </button>

          <button
            onClick={() => setIsBillModalOpen(true)}
            className="p-3.5 rounded-2xl bg-white border border-beige hover:border-gold-300 shadow-soft flex items-center justify-center gap-2 text-xs font-semibold text-charcoal hover:bg-cream-50 transition-colors active:scale-98"
          >
            <Receipt className="w-4 h-4 text-gold-700" />
            <span>Request Final Bill</span>
          </button>

          <Link
            to="/menu"
            className="p-3.5 rounded-2xl bg-charcoal text-white hover:bg-emerald shadow-soft flex items-center justify-center gap-2 text-xs font-semibold transition-colors active:scale-98"
          >
            <Plus className="w-4 h-4 text-gold" />
            <span>Order More Dishes</span>
          </Link>
        </div>

        {/* Items Summary Card */}
        <div className="p-5 rounded-2xl bg-white border border-beige shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-beige pb-3">
            <h3 className="font-serif font-bold text-base text-charcoal">Ordered Dishes</h3>
            <span className="text-[11px] text-charcoal-600 font-medium">
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="divide-y divide-beige/60">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <DietaryBadge isVeg={item.foodItem.isVegetarian} size="sm" />
                  <div>
                    <span className="font-serif font-bold text-sm text-charcoal">{item.foodItem.name}</span>
                    <span className="text-gold-700 font-mono font-bold ml-1.5">×{item.quantity}</span>
                    {item.specialInstructions && (
                      <p className="text-[10px] text-charcoal-600 italic mt-0.5">
                        "{item.specialInstructions}"
                      </p>
                    )}
                  </div>
                </div>

                <span className="font-serif font-bold text-xs sm:text-sm text-charcoal">
                  {formatCurrency(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="pt-3 border-t border-dashed border-beige space-y-1.5 text-xs text-charcoal-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-charcoal">{formatCurrency(order.breakdown.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (5%)</span>
              <span className="font-medium text-charcoal">{formatCurrency(order.breakdown.gstTotal)}</span>
            </div>
            <div className="pt-2 border-t border-beige flex justify-between items-baseline font-serif font-bold text-sm sm:text-base text-charcoal">
              <span>Total Paid / Payable</span>
              <span>{formatCurrency(order.breakdown.finalTotal)}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Service Modals */}
      <CallWaiterModal
        isOpen={isWaiterModalOpen}
        onClose={() => setIsWaiterModalOpen(false)}
      />

      <RequestBillModal
        isOpen={isBillModalOpen}
        onClose={() => setIsBillModalOpen(false)}
      />
    </div>
  )
}

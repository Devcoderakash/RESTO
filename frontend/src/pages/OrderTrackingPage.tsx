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
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { DietaryBadge } from '../components/menu/DietaryBadge'
import { CallWaiterModal } from '../components/modals/CallWaiterModal'
import { RequestBillModal } from '../components/modals/RequestBillModal'
import { Order, OrderStage } from '../types/order'
import { formatCurrency, formatTime } from '../lib/formatters'
import { getTrackedOrder } from '../services/api'

const STAGE_CONFIG: Record<
  OrderStage,
  { title: string; subtitle: string; icon: React.ReactNode; color: string }
> = {
  received: {
    title: 'Order Received',
    subtitle: 'Kitchen received your ticket and is queuing the preparation',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  accepted: {
    title: 'Order Accepted',
    subtitle: 'Head Chef Marco has reviewed your table specifications',
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
  },
  preparing: {
    title: 'Preparing in Kitchen',
    subtitle: 'Dishes are firing on the wood hearth and fresh pasta station',
    icon: <Flame className="w-5 h-5" />,
    color: 'text-amber-700 bg-amber-50 border-amber-300',
  },
  ready: {
    title: 'Ready to Serve',
    subtitle: 'Plated, garnished, and being expedited to your table',
    icon: <ChefHat className="w-5 h-5" />,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  served: {
    title: 'Served at Table',
    subtitle: 'Enjoy your meal! Buon appetito.',
    icon: <UtensilsCrossed className="w-5 h-5" />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  },
  completed: {
    title: 'Order Completed',
    subtitle: 'Thank you for dining with us.',
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  },
  cancelled: {
    title: 'Order Cancelled',
    subtitle: 'Please contact restaurant staff if you need assistance.',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-red-700 bg-red-50 border-red-300',
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
    let timeout: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try {
        const latest = await getTrackedOrder(orderId)
        if (active) {
          setOrder(latest)
          setLoadError(null)
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load order status.')
      } finally {
        if (active) {
          setIsLoading(false)
          timeout = setTimeout(refresh, 5000)
        }
      }
    }
    void refresh()
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [orderId])

  if (!order) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-beige shadow-soft text-center space-y-4">
          {isLoading ? <Clock className="w-12 h-12 text-gold-700 mx-auto animate-pulse" /> : <AlertCircle className="w-12 h-12 text-amber-600 mx-auto" />}
          <h2 className="font-serif font-bold text-2xl text-charcoal">{isLoading ? 'Loading Order' : 'Order Unavailable'}</h2>
          <p className="text-sm text-charcoal-600">
            {loadError || `We couldn't load order #${orderId}. Please check your connection and try again.`}
          </p>
          <Link to="/menu">
            <Button variant="gold" size="md" className="w-full">
              Back to Digital Menu
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentStageIndex = order.status === 'completed'
    ? STAGES.length - 1
    : STAGES.indexOf(order.status)
  const isFinished = order.status === 'served' || order.status === 'completed' || order.status === 'cancelled'

  return (
    <div className="min-h-screen bg-cream-100/70 pb-20">
      {/* Header */}
      <nav aria-label="Order tracking navigation" className="sticky top-0 z-30 glass-header border-b border-beige py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-sm font-medium text-charcoal-700 hover:text-charcoal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Digital Menu</span>
          </Link>

          <div className="text-center">
            <h1 className="font-serif font-bold text-lg sm:text-xl text-charcoal">
              Live Order Tracker
            </h1>
            <p className="text-xs text-charcoal-600 font-mono">
              Order #{order.id}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gold-50 text-gold-800 border border-gold-200">
              TABLE {order.tableNumber}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Important notice badge */}
        <div className="p-3 rounded-2xl bg-cream-200/60 border border-beige-dark flex items-center gap-2.5 text-xs text-charcoal-700">
          <Info className="w-4 h-4 text-gold-700 shrink-0" />
          <span>
            <strong>Live order status:</strong> This page refreshes automatically while the restaurant updates your order.
            {loadError ? ` Latest status could not be refreshed: ${loadError}` : ''}
          </span>
        </div>

        {/* Current Status Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-beige shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-600">
                  Current Kitchen State
                </span>
              </div>
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal mt-1">
                {STAGE_CONFIG[order.status].title}
              </h2>
              <p className="text-sm text-charcoal-600 mt-1 max-w-lg">
                {STAGE_CONFIG[order.status].subtitle}
              </p>
            </div>

            {/* Estimated Time Badge */}
            <div className="p-4 rounded-2xl bg-cream-100 border border-beige text-center sm:text-right shrink-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-600">
                Estimated Service Time
              </div>
              <div className="font-serif font-bold text-2xl text-gold-700 mt-0.5">
                {order.status === 'completed' ? 'Completed' : isFinished ? 'Served' : `~${order.estimatedTimeMinutes} mins`}
              </div>
              <div className="text-[11px] text-charcoal-600">
                Placed at {formatTime(order.createdAt)}
              </div>
            </div>
          </div>

          {/* Interactive Progress Timeline */}
          <div className="pt-4">
            <div className="relative">
              {/* Connecting background line */}
              <div className="absolute top-6 left-6 right-6 h-1 bg-cream-200 hidden sm:block -z-0" />
              <div
                className="absolute top-6 left-6 h-1 bg-gold transition-all duration-700 hidden sm:block -z-0"
                style={{ width: `${(Math.max(currentStageIndex, 0) / (STAGES.length - 1)) * 90}%` }}
              />

              {/* Timeline Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                {STAGES.map((stageKey, idx) => {
                  const stageInfo = STAGE_CONFIG[stageKey]
                  const isDone = idx < currentStageIndex
                  const isCurrent = idx === currentStageIndex
                  const isPending = idx > currentStageIndex

                  return (
                    <div
                      key={stageKey}
                      className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2.5"
                    >
                      {/* Step Circle */}
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-xs shrink-0 ${
                          isCurrent
                            ? 'bg-gold text-white ring-4 ring-gold/20 scale-105'
                            : isDone
                            ? 'bg-charcoal text-cream-100'
                            : 'bg-cream-100 text-charcoal-600 border border-beige'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-gold-light" />
                        ) : (
                          stageInfo.icon
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 sm:flex-initial">
                        <div
                          className={`font-serif font-bold text-sm leading-tight ${
                            isCurrent
                              ? 'text-gold-800'
                              : isDone
                              ? 'text-charcoal'
                              : 'text-charcoal-600'
                          }`}
                        >
                          {stageInfo.title}
                        </div>
                        <div className="text-[10px] text-charcoal-600 mt-0.5">
                          Step {idx + 1} of 5
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Order Details & Items Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Items breakdown (7 cols) */}
          <div className="md:col-span-7 p-6 rounded-3xl bg-white border border-beige shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-beige pb-3">
              <h3 className="font-serif font-bold text-lg text-charcoal">Prepared Items</h3>
              <span className="text-xs font-mono text-gold-700 font-semibold">
                TABLE {order.tableNumber}
              </span>
            </div>

            <div className="divide-y divide-beige-light space-y-3">
              {order.items.map((item) => (
                <div key={item.cartItemId} className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-sm">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <DietaryBadge isVeg={item.foodItem.isVegetarian} size="sm" />
                      <span className="font-serif font-bold text-charcoal">{item.foodItem.name}</span>
                      <span className="text-xs font-bold text-gold-700">×{item.quantity}</span>
                    </div>

                    {item.selectedCustomizations.length > 0 && (
                      <div className="text-xs text-charcoal-600 pl-4">
                        {item.selectedCustomizations.map((c) => c.optionName).join(', ')}
                      </div>
                    )}

                    {item.specialInstructions && (
                      <div className="text-[11px] text-charcoal-600 italic pl-4">
                        Instructions: "{item.specialInstructions}"
                      </div>
                    )}
                  </div>

                  <span className="font-serif font-bold text-charcoal">
                    {formatCurrency(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            {order.orderNotes && (
              <div className="p-3 rounded-xl bg-cream-50 border border-beige text-xs text-charcoal-700">
                <strong>Table Notes:</strong> {order.orderNotes}
              </div>
            )}
          </div>

          {/* Table Hospitality & Payment Card (5 cols) */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-beige shadow-soft space-y-4">
              <h3 className="font-serif font-bold text-lg text-charcoal">Bill & Table Actions</h3>

              <div className="space-y-2 text-sm text-charcoal-700 pb-3 border-b border-beige">
                <div className="flex justify-between">
                  <span className="text-charcoal-600">Subtotal</span>
                  <span>{formatCurrency(order.breakdown.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-charcoal-600">
                  <span>GST (5%)</span>
                  <span>{formatCurrency(order.breakdown.gstTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-charcoal-600">
                  <span>Service Charge (5%)</span>
                  <span>{formatCurrency(order.breakdown.serviceCharge)}</span>
                </div>
                <div className="flex justify-between font-serif font-bold text-base text-charcoal pt-1 border-t border-dashed border-beige">
                  <span>Total Amount</span>
                  <span className="text-gold-700">{formatCurrency(order.breakdown.finalTotal)}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => setIsWaiterModalOpen(true)}
                  className="w-full p-3 rounded-xl bg-cream-100 hover:bg-cream-200 border border-beige text-charcoal text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <BellRing className="w-4 h-4 text-gold-700" />
                  <span>Call Waiter to Table {order.tableNumber}</span>
                </button>

                <button
                  onClick={() => setIsBillModalOpen(true)}
                  className="w-full p-3 rounded-xl bg-gold-50 hover:bg-gold-100 border border-gold-200 text-gold-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Receipt className="w-4 h-4 text-gold-700" />
                  <span>Request Table Check</span>
                </button>
              </div>

              <div className="pt-2">
                <Link to="/">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Order Additional Dishes
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
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

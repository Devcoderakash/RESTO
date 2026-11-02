import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ChefHat,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  LayoutDashboard,
  UtensilsCrossed,
  ArrowRight,
} from 'lucide-react'
import { useOrderStore } from '../store/useOrderStore'
import { Order } from '../types'
import { toast } from 'sonner'

export const ChefDashboardPage: React.FC = () => {
  const { orders, updateOrderStatus, fetchOrders } = useOrderStore()

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])
  const [activeTab, setActiveTab] = useState<'all' | 'Accepted' | 'Preparing' | 'Ready'>('all')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())

  // Update live kitchen clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 3 Primary Stages for the Chef
  const acceptedOrders = orders.filter((o) => o.orderStatus === 'Accepted')
  const preparingOrders = orders.filter((o) => o.orderStatus === 'Preparing')
  const readyOrders = orders.filter((o) => o.orderStatus === 'Ready')

  // One-click status advances
  const handleStartCooking = async (orderId: string, tableNumber: string) => {
    if (await updateOrderStatus(orderId, 'Preparing')) {
      toast.warning(`Table ${tableNumber}: Dishes firing on stove/hearth!`)
    }
  }

  const handleMarkReady = async (orderId: string, tableNumber: string) => {
    if (await updateOrderStatus(orderId, 'Ready')) {
      toast.success(`Table ${tableNumber} is READY! Waiter notified to serve.`)
    }
  }

  const renderTicketCard = (order: Order) => {
    const isAccepted = order.orderStatus === 'Accepted'
    const isPreparing = order.orderStatus === 'Preparing'
    const isReady = order.orderStatus === 'Ready'

    return (
      <div
        key={order.id}
        className={`bg-[#201F1C] rounded-2xl border-2 transition-all shadow-lg flex flex-col justify-between overflow-hidden ${
          isAccepted
            ? 'border-amber-500 shadow-amber-500/10'
            : isPreparing
            ? 'border-orange-500 shadow-orange-500/10'
            : 'border-emerald-500 shadow-emerald-500/10'
        }`}
      >
        {/* Ticket Header: Large Table Number & Time */}
        <div className="p-4 bg-[#181715] border-b border-[#302E29] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E9B93]">
              Order #{order.id}
            </span>
            <div className="font-serif font-black text-2xl sm:text-3xl text-white tracking-tight mt-0.5">
              TABLE {order.tableNumber}
            </div>
          </div>

          <div className="text-right space-y-1">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isAccepted
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : isPreparing
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {isAccepted ? 'Accepted Order' : isPreparing ? 'Cooking Now' : 'Ready to Serve'}
            </span>
            <p className="text-xs text-[#85827A] flex items-center justify-end gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>
        </div>

        {/* Special Instructions Banner */}
        {order.specialInstructions && (
          <div className="px-4 py-2.5 bg-amber-950/60 border-b border-amber-700/60 text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wide text-[10px] text-amber-400 block">
                Special Request:
              </span>
              <p className="font-semibold text-sm leading-snug">{order.specialInstructions}</p>
            </div>
          </div>
        )}

        {/* Food Items & Big Quantities */}
        <div className="p-4 sm:p-5 flex-1 space-y-3">
          <div className="divide-y divide-[#2E2C27]">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#2D2A24] text-[#B99A62] font-black text-base flex items-center justify-center shrink-0 border border-[#444036]">
                    {item.quantity}x
                  </span>
                  <div>
                    <span className="text-base sm:text-lg font-bold text-white tracking-tight block">
                      {item.name}
                    </span>
                    {item.notes && (
                      <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                        ↳ Note: {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Single Big Clear Action Button */}
        <div className="p-4 bg-[#181715] border-t border-[#302E29]">
          {isAccepted && (
            <button
              onClick={() => handleStartCooking(order.id, order.tableNumber)}
              className="w-full py-4 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-base tracking-wide transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Flame className="w-5 h-5 fill-white" />
              <span>Start Preparing</span>
            </button>
          )}

          {isPreparing && (
            <button
              onClick={() => handleMarkReady(order.id, order.tableNumber)}
              className="w-full py-4 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base tracking-wide transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Mark as Ready</span>
            </button>
          )}

          {isReady && (
            <div className="space-y-2">
              <div className="py-2.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ready at kitchen pass • Waiter notified</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141312] text-stone-200 flex flex-col antialiased">
      {/* Top Simple Kitchen Header */}
      <header className="bg-[#1C1B18] border-b border-[#2C2A25] px-4 sm:px-6 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B99A62] text-stone-950 flex items-center justify-center shadow-md">
              <ChefHat className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-serif font-black text-lg sm:text-xl text-white tracking-tight">
                Kitchen Orders
              </h1>
              <p className="text-xs text-[#85827A]">
                Head Chef Station • Refreshes every 20 seconds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Clock */}
            <div className="px-3 py-1.5 rounded-xl bg-[#141312] border border-[#2C2A25] font-mono text-sm font-bold text-[#B99A62]">
              {currentTime}
            </div>

            {/* Chime toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled)
                toast.info(soundEnabled ? 'Chime muted' : 'Chime active')
              }}
              className="p-2 rounded-xl bg-[#25231F] text-stone-300 border border-[#33302A] hover:bg-[#302D26]"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#B99A62]" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
            </button>

            {/* Return to Admin */}
            <Link
              to="/"
              className="px-3 py-1.5 rounded-xl bg-[#25231F] text-xs font-semibold text-stone-300 hover:text-white border border-[#33302A]"
            >
              Exit to Admin
            </Link>
          </div>
        </div>

        {/* 3 Clear Status Tabs */}
        <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-[#2C2A25] flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'all'
                ? 'bg-[#B99A62] text-stone-950 shadow-sm'
                : 'bg-[#25231F] text-stone-400 hover:text-white'
            }`}
          >
            All Orders ({acceptedOrders.length + preparingOrders.length + readyOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('Accepted')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'Accepted'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-[#25231F] text-amber-400 hover:bg-[#2C2923]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>1. Accepted Orders ({acceptedOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('Preparing')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'Preparing'
                ? 'bg-orange-500 text-stone-950 shadow-sm'
                : 'bg-[#25231F] text-orange-400 hover:bg-[#2C2923]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>2. Preparing ({preparingOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('Ready')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'Ready'
                ? 'bg-emerald-500 text-stone-950 shadow-sm'
                : 'bg-[#25231F] text-emerald-400 hover:bg-[#2C2923]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>3. Ready ({readyOrders.length})</span>
          </button>
        </div>
      </header>

      {/* Main Ticket Display */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'all' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Column 1: Accepted Orders */}
            <div className="space-y-4">
              <div className="pb-2 border-b-2 border-amber-500/80 flex items-center justify-between">
                <h2 className="font-bold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  1. Accepted Orders ({acceptedOrders.length})
                </h2>
              </div>
              <div className="space-y-4">
                {acceptedOrders.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#85827A] bg-[#1C1B18] rounded-2xl border border-[#2A2824]">
                    No accepted orders right now.
                  </p>
                ) : (
                  acceptedOrders.map((o) => renderTicketCard(o))
                )}
              </div>
            </div>

            {/* Column 2: Preparing */}
            <div className="space-y-4">
              <div className="pb-2 border-b-2 border-orange-500/80 flex items-center justify-between">
                <h2 className="font-bold text-sm uppercase tracking-wider text-orange-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  2. Cooking Now ({preparingOrders.length})
                </h2>
              </div>
              <div className="space-y-4">
                {preparingOrders.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#85827A] bg-[#1C1B18] rounded-2xl border border-[#2A2824]">
                    No dishes currently on the stove.
                  </p>
                ) : (
                  preparingOrders.map((o) => renderTicketCard(o))
                )}
              </div>
            </div>

            {/* Column 3: Ready */}
            <div className="space-y-4">
              <div className="pb-2 border-b-2 border-emerald-500/80 flex items-center justify-between">
                <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  3. Ready to Serve ({readyOrders.length})
                </h2>
              </div>
              <div className="space-y-4">
                {readyOrders.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#85827A] bg-[#1C1B18] rounded-2xl border border-[#2A2824]">
                    No dishes awaiting pickup.
                  </p>
                ) : (
                  readyOrders.map((o) => renderTicketCard(o))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(activeTab === 'Accepted'
              ? acceptedOrders
              : activeTab === 'Preparing'
              ? preparingOrders
              : readyOrders
            ).map((o) => renderTicketCard(o))}
          </div>
        )}
      </main>
    </div>
  )
}

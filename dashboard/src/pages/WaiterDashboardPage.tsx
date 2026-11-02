import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  UtensilsCrossed,
  ChefHat,
  BellRing,
  Receipt,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useOrderStore } from '../store/useOrderStore'
import { useWaiterRequestStore } from '../store/useWaiterRequestStore'
import { toast } from 'sonner'

export const WaiterDashboardPage: React.FC = () => {
  const { orders, updateOrderStatus, fetchOrders } = useOrderStore()
  const {
    tableRequests,
    billRequests,
    completeTableRequest,
    completeBillRequest,
    fetchRequests,
  } = useWaiterRequestStore()

  useEffect(() => {
    void fetchOrders()
    void fetchRequests()
  }, [fetchOrders, fetchRequests])

  const [activeTab, setActiveTab] = useState<'ready' | 'calls' | 'bills'>('ready')

  // Orders that kitchen marked "Ready"
  const readyOrders = orders.filter((o) => o.orderStatus === 'Ready')

  // Diner assistance calls that are pending
  const pendingCalls = tableRequests.filter((r) => r.status !== 'completed')

  // Diner bill requests that are pending
  const pendingBills = billRequests.filter((b) => b.status !== 'completed')

  const totalTasks = readyOrders.length + pendingCalls.length + pendingBills.length

  const handleMarkServed = async (orderId: string, tableNumber: string) => {
    if (await updateOrderStatus(orderId, 'Served')) {
      toast.success(`Table ${tableNumber}: Food served! Order complete.`)
    }
  }

  const handleCompleteRequest = async (requestId: string, tableNumber: string) => {
    if (await completeTableRequest(requestId)) {
      toast.success(`Table ${tableNumber}: Request marked completed!`)
    }
  }

  const handleCompleteBill = async (billId: string, tableNumber: string) => {
    if (await completeBillRequest(billId)) {
      toast.success(`Table ${tableNumber}: Bill completed!`)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#22211F] flex flex-col antialiased">
      {/* Top Simple Waiter Header */}
      <header className="bg-white border-b border-[#EAE7DF] px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22211F] text-[#B99A62] flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-black text-xl text-[#22211F]">
                  Waiter Service
                </h1>
                {totalTasks > 0 ? (
                  <span className="text-xs font-bold bg-[#B99A62] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                    {totalTasks} Waiting
                  </span>
                ) : (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    All Done
                  </span>
                )}
              </div>
              <p className="text-xs text-[#85827A]">
                Floor Service & Table Assistance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F3] text-xs font-semibold text-[#22211F] border border-[#EAE7DF]"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>

        {/* 3 Simple Action Feeds */}
        <div className="max-w-4xl mx-auto mt-3 pt-3 border-t border-[#EAE7DF] grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab('ready')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ready'
                ? 'bg-[#22211F] text-white shadow-xs'
                : 'bg-white text-[#85827A] border border-[#EAE7DF] hover:bg-[#FAF8F3]'
            }`}
          >
            <ChefHat className="w-4 h-4 text-[#B99A62]" />
            <span>Ready Food</span>
            <span className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${readyOrders.length > 0 ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-700'}`}>
              {readyOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'calls'
                ? 'bg-[#22211F] text-white shadow-xs'
                : 'bg-white text-[#85827A] border border-[#EAE7DF] hover:bg-[#FAF8F3]'
            }`}
          >
            <BellRing className="w-4 h-4 text-[#B99A62]" />
            <span>Table Calls</span>
            <span className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${pendingCalls.length > 0 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-700'}`}>
              {pendingCalls.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'bills'
                ? 'bg-[#22211F] text-white shadow-xs'
                : 'bg-white text-[#85827A] border border-[#EAE7DF] hover:bg-[#FAF8F3]'
            }`}
          >
            <Receipt className="w-4 h-4 text-[#B99A62]" />
            <span>Bills</span>
            <span className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${pendingBills.length > 0 ? 'bg-sky-500 text-white' : 'bg-stone-200 text-stone-700'}`}>
              {pendingBills.length}
            </span>
          </button>
        </div>
      </header>

      {/* Main Single Action Screen */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* TAB 1: READY TO SERVE */}
        {activeTab === 'ready' && (
          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#EAE7DF] p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="font-serif font-bold text-xl text-[#22211F]">
                  No Food Waiting to be Served
                </h2>
                <p className="text-sm text-[#85827A] max-w-md mx-auto">
                  When the chef marks an order "Ready", the table number and dishes will show here with a big button to mark as served.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {readyOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border-2 border-emerald-500 p-5 shadow-soft flex flex-col justify-between space-y-5"
                  >
                    <div>
                      {/* Big Table Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                        <div>
                          <span className="text-xs font-bold text-[#85827A] uppercase tracking-wider block">
                            Order #{order.id}
                          </span>
                          <span className="font-serif font-black text-3xl text-[#22211F]">
                            TABLE {order.tableNumber}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Hot & Ready</span>
                        </span>
                      </div>

                      {/* Items */}
                      <div className="pt-4 space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-[#FAF6EE] text-[#937844] font-black text-sm flex items-center justify-center border border-[#DCBD86]/30">
                              {item.quantity}x
                            </span>
                            <span className="font-bold text-base text-[#22211F]">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.specialInstructions && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold">
                          Note: {order.specialInstructions}
                        </div>
                      )}
                    </div>

                    {/* Big Action Button */}
                    <button
                      onClick={() => handleMarkServed(order.id, order.tableNumber)}
                      className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>Mark as Served</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TABLE REQUESTS */}
        {activeTab === 'calls' && (
          <div className="space-y-4">
            {pendingCalls.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#EAE7DF] p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="font-serif font-bold text-xl text-[#22211F]">
                  No Customer Requests
                </h2>
                <p className="text-sm text-[#85827A] max-w-md mx-auto">
                  All customer calls for water, cutlery, or assistance have been handled.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingCalls.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl border-2 border-amber-400 p-5 shadow-soft flex flex-col justify-between space-y-5"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                        <div>
                          <span className="text-xs font-bold text-[#85827A] uppercase tracking-wider block">
                            Assistance Needed
                          </span>
                          <span className="font-serif font-black text-3xl text-[#22211F]">
                            TABLE {req.tableNumber}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          {req.time}
                        </span>
                      </div>

                      <div className="pt-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#B99A62] block">
                          Customer Request:
                        </span>
                        <p className="text-base font-bold text-[#22211F] mt-1">
                          "{req.details}"
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCompleteRequest(req.id, req.tableNumber)}
                      className="w-full py-4 px-6 rounded-2xl bg-[#22211F] hover:bg-[#2F2E2B] text-white font-black text-base shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5 text-[#B99A62]" />
                      <span>Complete Request</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BILL REQUESTS */}
        {activeTab === 'bills' && (
          <div className="space-y-4">
            {pendingBills.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#EAE7DF] p-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                  <Receipt className="w-8 h-8" />
                </div>
                <h2 className="font-serif font-bold text-xl text-[#22211F]">
                  No Bills Requested
                </h2>
                <p className="text-sm text-[#85827A] max-w-md mx-auto">
                  When a table requests their check, it will show up here immediately.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="bg-white rounded-3xl border-2 border-sky-400 p-5 shadow-soft flex flex-col justify-between space-y-5"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
                        <div>
                          <span className="text-xs font-bold text-[#85827A] uppercase tracking-wider block">
                            Bill Request
                          </span>
                          <span className="font-serif font-black text-3xl text-[#22211F]">
                            TABLE {bill.tableNumber}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-serif font-black text-2xl text-[#22211F]">
                            ${bill.amount.toFixed(2)}
                          </span>
                          <span className="text-xs block font-bold text-sky-700 uppercase">
                            Prefers: {bill.paymentPreference}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 text-xs text-[#85827A]">
                        Ticket: {bill.orderId || 'Active Order'} • Requested {bill.time}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCompleteBill(bill.id, bill.tableNumber)}
                      className="w-full py-4 px-6 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-black text-base shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      <span>Complete Request</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

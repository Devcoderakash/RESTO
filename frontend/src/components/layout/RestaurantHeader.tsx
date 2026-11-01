import React from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Wifi,
  BellRing,
  Receipt,
  UtensilsCrossed,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { useTableStore } from '../../store/tableStore'
import { useRestaurantStore } from '../../store/restaurantStore'
import { formatCurrency } from '../../lib/formatters'

interface RestaurantHeaderProps {
  onOpenWifiModal: () => void
  onOpenCallWaiterModal: () => void
  onOpenRequestBillModal?: () => void
  onOpenTableSwitchModal?: () => void
  onFocusSearch?: () => void
}

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({
  onOpenWifiModal,
  onOpenCallWaiterModal,
  onOpenRequestBillModal,
  onOpenTableSwitchModal,
}) => {
  const { getTotalCount, getBreakdown, openDrawer } = useCartStore()
  const { currentTable } = useTableStore()
  const restaurantInfo = useRestaurantStore((s) => s.info)
  const totalCount = getTotalCount()
  const breakdown = getBreakdown()

  return (
    <header className="w-full bg-white border-b border-beige/90 transition-all">
      {/* ============================================================== */}
      {/* 1. DESKTOP / LAPTOP HEADER (md:flex - preserved and polished) */}
      {/* ============================================================== */}
      <div className="hidden md:block">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link
            to="/menu"
            className="flex items-center gap-2.5 group active:scale-[0.98] transition-transform"
          >
            <div className="w-9 h-9 rounded-xl bg-charcoal text-gold flex items-center justify-center shadow-xs group-hover:bg-emerald transition-colors">
              <UtensilsCrossed className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-serif font-bold text-base text-charcoal tracking-tight block leading-tight">
                {restaurantInfo?.name || 'The Olive & Ember'}
              </span>
              <span className="text-[10px] text-charcoal-600 font-medium">
                Artisanal Kitchen & Digital Table Service
              </span>
            </div>
          </Link>

          {/* Table Badge */}
          <div className="flex items-center gap-3">
            <Link
              to="/select-table"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cream-100 hover:bg-gold-50 border border-beige hover:border-gold-300 transition-all text-xs text-charcoal active:scale-95"
              title="Change dining table"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs">
                Table <strong className="font-bold text-charcoal">{currentTable || '01'}</strong>
              </span>
              <span className="text-[10px] font-semibold text-gold-700 underline uppercase tracking-wider ml-0.5">
                Change
              </span>
            </Link>
          </div>

          {/* Actions: Wi-Fi, Call Waiter, Request Bill, Cart */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenWifiModal}
              className="px-3 py-2 text-xs font-semibold text-charcoal-700 bg-cream-50 hover:bg-cream-200/70 rounded-xl border border-beige transition-colors flex items-center gap-1.5 active:scale-95 shadow-2xs"
              title="Wi-Fi Network & Password"
            >
              <Wifi className="w-4 h-4 text-gold-700" />
              <span>Wi-Fi</span>
            </button>

            <button
              type="button"
              onClick={onOpenCallWaiterModal}
              className="px-3 py-2 text-xs font-semibold text-charcoal-700 bg-cream-50 hover:bg-cream-200/70 rounded-xl border border-beige transition-colors flex items-center gap-1.5 active:scale-95 shadow-2xs"
              title="Call server or request assistance"
            >
              <BellRing className="w-4 h-4 text-gold-700" />
              <span>Call Waiter</span>
            </button>

            {onOpenRequestBillModal && (
              <button
                type="button"
                onClick={onOpenRequestBillModal}
                className="px-3 py-2 text-xs font-semibold text-charcoal-700 bg-cream-50 hover:bg-cream-200/70 rounded-xl border border-beige transition-colors flex items-center gap-1.5 active:scale-95 shadow-2xs"
                title="Request bill"
              >
                <Receipt className="w-4 h-4 text-gold-700" />
                <span>Request Bill</span>
              </button>
            )}

            <button
              type="button"
              onClick={openDrawer}
              className="relative flex items-center gap-2 px-4 py-2 bg-charcoal text-white hover:bg-emerald rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95"
              aria-label={`Open Cart (${totalCount} items)`}
            >
              <ShoppingBag className="w-4 h-4 text-gold" />
              <span>Cart</span>
              {totalCount > 0 ? (
                <span className="w-5 h-5 rounded-full bg-gold text-charcoal text-[11px] font-bold flex items-center justify-center -mr-1">
                  {totalCount}
                </span>
              ) : (
                <span className="text-charcoal-200/70 text-xs font-normal">(0)</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MOBILE-FIRST RESTAURANT EXPERIENCE (< md:block)            */}
      {/* Structure: Top Brand -> Table & Status -> Compact Actions     */}
      {/* ============================================================== */}
      <div className="block md:hidden px-4 pt-3.5 pb-3 space-y-3">
        {/* SECTION 1: RESTAURANT IDENTITY & CART BUTTON */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-charcoal text-gold flex items-center justify-center shadow-xs shrink-0 border border-gold/30">
              <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif font-bold text-lg text-charcoal tracking-tight truncate leading-tight">
                {restaurantInfo?.name || 'The Olive & Ember'}
              </h1>
              <p className="text-[11px] text-charcoal-600 font-medium truncate mt-0.5">
                Artisan Kitchen & Digital Table Ordering
              </p>
            </div>
          </div>

          {/* Compact Mobile Cart Trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className="shrink-0 relative flex items-center gap-1.5 px-3 py-2 bg-charcoal text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 border border-gold/30"
            aria-label={`Open Cart (${totalCount} items)`}
          >
            <ShoppingBag className="w-4 h-4 text-gold" />
            <span>{totalCount > 0 ? totalCount : 'Cart'}</span>
            {totalCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            )}
          </button>
        </div>

        {/* SECTION 2: DINING TABLE & KITCHEN STATUS */}
        <div className="flex items-center justify-between gap-2 bg-cream-50/90 px-3.5 py-2 rounded-xl border border-beige/80">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-charcoal-600 font-medium">Seated at:</span>
            <span className="font-serif font-black text-charcoal tracking-wide bg-white px-2 py-0.5 rounded-lg border border-beige/80 shadow-2xs">
              TABLE {currentTable || '01'}
            </span>
            <Link
              to="/select-table"
              className="text-[11px] font-semibold text-gold-700 hover:text-gold-900 underline ml-0.5 flex items-center gap-0.5"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>Change</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Kitchen Open</span>
          </div>
        </div>

        {/* SECTION 3: COMPACT RESTAURANT INFORMATION ACTIONS */}
        {/* Wi-Fi, Call Waiter, and Request Bill in a clean, predictable 3-column grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Wi-Fi Details */}
          <button
            type="button"
            onClick={onOpenWifiModal}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white text-charcoal text-xs font-semibold border border-beige shadow-2xs hover:bg-cream-50 active:scale-95 transition-all"
            aria-label="View restaurant Wi-Fi details"
          >
            <Wifi className="w-3.5 h-3.5 text-gold-700 shrink-0" />
            <span className="truncate">Wi-Fi</span>
          </button>

          {/* Call Server */}
          <button
            type="button"
            onClick={onOpenCallWaiterModal}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white text-charcoal text-xs font-semibold border border-beige shadow-2xs hover:bg-cream-50 active:scale-95 transition-all"
            aria-label="Call waiter for assistance"
          >
            <BellRing className="w-3.5 h-3.5 text-gold-700 shrink-0" />
            <span className="truncate">Call Server</span>
          </button>

          {/* Request Bill */}
          <button
            type="button"
            onClick={onOpenRequestBillModal || onOpenCallWaiterModal}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white text-charcoal text-xs font-semibold border border-beige shadow-2xs hover:bg-cream-50 active:scale-95 transition-all"
            aria-label="Request bill"
          >
            <Receipt className="w-3.5 h-3.5 text-gold-700 shrink-0" />
            <span className="truncate">Bill</span>
          </button>
        </div>
      </div>
    </header>
  )
}

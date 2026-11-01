import React from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Wifi,
  BellRing,
  UtensilsCrossed,
} from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { useTableStore } from '../../store/tableStore'
import { useRestaurantStore } from '../../store/restaurantStore'

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
}) => {
  const { getTotalCount, openDrawer } = useCartStore()
  const { currentTable } = useTableStore()
  const restaurantInfo = useRestaurantStore((s) => s.info)
  const totalCount = getTotalCount()

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-beige/90 transition-all">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Restaurant Brand */}
        <Link
          to="/menu"
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 group active:scale-[0.98] transition-transform"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-charcoal text-gold flex items-center justify-center shadow-xs group-hover:bg-emerald transition-colors">
            <UtensilsCrossed className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div>
            <span className="font-serif font-bold text-sm sm:text-base text-charcoal tracking-tight block leading-tight">
              {restaurantInfo?.name || 'The Olive & Ember'}
            </span>
            <span className="hidden sm:block text-[10px] text-charcoal-600 font-medium">
              Digital Dining Table Service
            </span>
          </div>
        </Link>

        {/* Center: Table Badge with Quick Change */}
        <div className="flex items-center">
          <Link
            to="/select-table"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-cream-100 hover:bg-gold-50 border border-beige hover:border-gold-300 transition-all text-xs text-charcoal active:scale-95"
            title="Tap to switch dining table"
          >
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[11px] sm:text-xs">
              Table <strong className="font-bold text-charcoal">{currentTable || '01'}</strong>
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-gold-700 underline uppercase tracking-wider ml-0.5">
              Change
            </span>
          </Link>
        </div>

        {/* Right Actions: Wi-Fi, Call Waiter, Cart */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Wi-Fi Action */}
          <button
            onClick={onOpenWifiModal}
            className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-charcoal-700 bg-cream-50 hover:bg-cream-200/70 rounded-xl border border-beige/80 transition-colors flex items-center gap-1.5 active:scale-95"
            title="Wi-Fi Network & Password"
            aria-label="View Wi-Fi details"
          >
            <Wifi className="w-4 h-4 text-gold-700" />
            <span className="hidden md:inline">Wi-Fi</span>
          </button>

          {/* Call Waiter */}
          <button
            onClick={onOpenCallWaiterModal}
            className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-charcoal-700 bg-cream-50 hover:bg-cream-200/70 rounded-xl border border-beige/80 transition-colors flex items-center gap-1.5 active:scale-95"
            title="Call server or request assistance"
            aria-label="Call Waiter"
          >
            <BellRing className="w-4 h-4 text-gold-700" />
            <span className="hidden md:inline">Call Waiter</span>
          </button>

          {/* Cart Button with Count Badge */}
          <button
            onClick={openDrawer}
            className="relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-charcoal text-white hover:bg-emerald rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95"
            aria-label={`Open Cart (${totalCount} items)`}
          >
            <ShoppingBag className="w-4 h-4 text-gold" />
            <span className="hidden sm:inline">Cart</span>
            {totalCount > 0 ? (
              <span className="w-5 h-5 rounded-full bg-gold text-charcoal text-[11px] font-bold flex items-center justify-center -mr-1 animate-in zoom-in-75">
                {totalCount}
              </span>
            ) : (
              <span className="hidden sm:inline text-charcoal-200/70 text-xs font-normal">
                (0)
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

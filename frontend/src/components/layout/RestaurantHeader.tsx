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
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-[#E9E4DA] shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Restaurant Name */}
        <Link to="/menu" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#22211F] text-[#B99A62] flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif font-bold text-base sm:text-lg text-[#22211F] tracking-tight block leading-tight">
              {restaurantInfo?.name || 'The Olive & Ember'}
            </span>
          </div>
        </Link>

        {/* Center: Selected Table with Change action */}
        <div className="flex items-center">
          <Link
            to="/select-table"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF6EE] border border-[#DCBD86]/50 text-xs font-medium text-[#22211F] hover:bg-[#F5ECDB] transition-colors"
            title="Click to change table"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Table <strong className="font-bold text-[#B99A62]">{currentTable || '01'}</strong></span>
            <span className="text-[10px] text-[#77736D] underline ml-1">Change</span>
          </Link>
        </div>

        {/* Right: Wi-Fi, Call Waiter, Cart */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Wi-Fi button */}
          <button
            onClick={onOpenWifiModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#22211F] bg-[#FAF8F3] hover:bg-[#F0ECE1] rounded-xl border border-[#E9E4DA] transition-colors"
            title="Wi-Fi Details"
          >
            <Wifi className="w-4 h-4 text-[#B99A62]" />
            <span className="hidden sm:inline">Wi-Fi</span>
          </button>

          {/* Call Waiter */}
          <button
            onClick={onOpenCallWaiterModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#22211F] bg-[#FAF8F3] hover:bg-[#F0ECE1] rounded-xl border border-[#E9E4DA] transition-colors"
            title="Call table waiter"
          >
            <BellRing className="w-4 h-4 text-[#B99A62]" />
            <span className="hidden sm:inline">Call Waiter</span>
          </button>

          {/* Cart button */}
          <button
            onClick={openDrawer}
            className="relative flex items-center gap-2 px-3.5 py-2 bg-[#22211F] text-white hover:bg-[#33312E] rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-4 h-4 text-[#B99A62]" />
            <span>Cart</span>
            {totalCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#B99A62] text-white text-[11px] font-bold flex items-center justify-center -mr-1">
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

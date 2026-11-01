import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Grid3X3,
  UtensilsCrossed,
  Layers,
  Users,
  UserCheck,
  CreditCard,
  Package,
  Tag,
  BarChart3,
  Star,
  Settings,
  Wifi,
  User,
  ChevronLeft,
  ChevronRight,
  Flame,
  X,
  BellRing,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOrderStore } from '../../store/useOrderStore'
import { useWaiterRequestStore } from '../../store/useWaiterRequestStore'

export interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
}

interface NavSection {
  title: string
  items: {
    label: string
    to: string
    icon: React.ElementType
    badge?: number | string
    badgeColor?: string
  }[]
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const location = useLocation()
  const orders = useOrderStore((state) => state.orders)
  const { tableRequests, billRequests } = useWaiterRequestStore()

  const pendingOrdersCount = orders.filter(
    (o) => o.orderStatus === 'New' || o.orderStatus === 'Accepted' || o.orderStatus === 'Preparing'
  ).length

  const pendingRequestsCount = tableRequests.filter((r) => r.status === 'pending').length +
    billRequests.filter((b) => b.status === 'pending').length

  const navSections: NavSection[] = [
    {
      title: 'OPERATIONS',
      items: [
        {
          label: 'Live Orders',
          to: '/',
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
          badgeColor: 'bg-brand text-sidebar font-bold',
        },
        {
          label: 'Waiter Requests',
          to: '/waiter',
          icon: BellRing,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          badgeColor: 'bg-amber-500 text-white font-bold',
        },
        { label: 'Floor Tables', to: '/tables', icon: Grid3X3 },
        { label: 'Menu Catalog', to: '/menu', icon: UtensilsCrossed },
        { label: 'Categories', to: '/categories', icon: Layers },
        { label: 'Payments', to: '/payments', icon: CreditCard },
      ],
    },
    {
      title: 'STAFF SCREENS',
      items: [
        { label: 'Kitchen KDS', to: '/chef', icon: Flame },
        { label: 'Settings', to: '/settings', icon: Settings },
      ],
    },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-text border-r border-sidebar-border selection:bg-brand selection:text-sidebar">
      {/* Brand Header */}
      <div className="h-18 flex items-center justify-between px-5 border-b border-sidebar-border/80 shrink-0">
        <NavLink
          to="/"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-sidebar shadow-md shadow-brand/20 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5 text-sidebar stroke-[2.2]" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                RESTO
                <span className="text-[10px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/30">
                  PRO
                </span>
              </span>
              <span className="text-[11px] text-sidebar-muted -mt-0.5 font-sans">
                Hospitality OS
              </span>
            </div>
          )}
        </NavLink>

        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden text-sidebar-muted hover:text-white p-1 rounded-lg"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex text-sidebar-muted hover:text-white p-1.5 rounded-lg hover:bg-sidebar-hover transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-bold tracking-wider text-sidebar-muted uppercase font-sans">
                {section.title}
              </p>
            ) : (
              <div className="h-2" />
            )}

            {section.items.map((item) => {
              const Icon = item.icon
              const isSettingsTab = item.to.includes('?tab=')
              const isActive = isSettingsTab
                ? location.pathname === '/settings' && location.search.includes(item.to.split('?tab=')[1])
                : location.pathname === item.to && !location.search.includes('tab=')

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-brand text-sidebar font-semibold shadow-sm'
                      : 'text-sidebar-muted hover:text-white hover:bg-sidebar-hover'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:scale-110',
                      isActive ? 'text-sidebar' : 'text-sidebar-muted group-hover:text-brand-light'
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1 tracking-normal">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] leading-tight',
                        item.badgeColor || 'bg-white/20 text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isCollapsed && item.badge !== undefined && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand" />
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer Profile Preview */}
      <div className="p-3 border-t border-sidebar-border/80 shrink-0 bg-sidebar-dark/40">
        <NavLink
          to="/settings"
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-hover transition-colors group',
            isCollapsed && 'justify-center'
          )}
        >
          <div className="relative shrink-0">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Manager Avatar"
              className="w-9 h-9 rounded-xl object-cover border border-brand/40 group-hover:border-brand"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Antoine Delacroix</p>
              <p className="text-[11px] text-brand-light truncate">General Manager</p>
            </div>
          )}
        </NavLink>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden md:block shrink-0 transition-all duration-300 ease-in-out z-30 select-none sticky top-0 h-screen',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 max-w-full h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}


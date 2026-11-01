import React, { useState, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Sliders,
} from 'lucide-react'
import { RestaurantSelector } from './RestaurantSelector'
import { useNotificationStore } from '../../store/useNotificationStore'
import { useRestaurantStore } from '../../store/useRestaurantStore'
import { SearchModal } from './SearchModal'
import { HelpModal } from './HelpModal'
import { toast } from 'sonner'
import { dashboardApi } from '../../services/api'

export interface TopNavbarProps {
  onMobileMenuToggle: () => void
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onMobileMenuToggle }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { unreadCount, setIsOpen: setNotificationOpen } = useNotificationStore()
  const { settings } = useRestaurantStore()
  const staffEmail = dashboardApi.getSessionEmail()
  const staffName = staffEmail.split('@')[0] || 'Staff account'

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  // Keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Derive human-readable page title and breadcrumbs from location
  const getPageInfo = () => {
    const path = location.pathname
    if (path === '/' || path === '/orders') return { title: 'Live Orders', category: 'Operations' }
    if (path === '/tables') return { title: 'Table Management', category: 'Floor' }
    if (path === '/menu') return { title: 'Menu Management', category: 'Catalog' }
    if (path === '/categories') return { title: 'Category Management', category: 'Catalog' }
    if (path === '/payments') return { title: 'Payment Transactions', category: 'Finance' }
    if (path === '/waiter') return { title: 'Waiter Requests', category: 'Floor Service' }
    if (path === '/chef') return { title: 'Kitchen Display', category: 'Culinary' }
    if (path === '/settings') {
      if (location.search.includes('tab=wifi')) return { title: 'Wi-Fi Settings', category: 'Settings' }
      return { title: 'Restaurant Settings', category: 'Settings' }
    }
    return { title: 'Restaurant OS', category: 'RESTO' }
  }

  const { title, category } = getPageInfo()

  return (
    <>
      <header className="h-18 bg-white border-b border-beige px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-xl text-charcoal hover:bg-beige-light transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-charcoal-muted uppercase tracking-wider font-medium">
              <span>{category}</span>
              <ChevronRight className="w-3 h-3 text-beige-dark" />
              <span className="text-brand font-semibold">{title}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-charcoal tracking-tight font-serif truncate">
              {title}
            </h1>
          </div>
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Staff Portals Switcher */}
          <div className="hidden md:flex items-center gap-1.5 bg-canvas p-1 rounded-xl border border-beige">
            <Link
              to="/chef"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-charcoal hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Chef Kitchen</span>
            </Link>
            <Link
              to="/waiter"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-charcoal hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Waiter Service</span>
            </Link>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-brand hover:bg-white hover:shadow-2xs transition-all flex items-center gap-1"
            >
              <span>Customer View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Restaurant Branch Selector */}
          <RestaurantSelector />

          {/* Quick Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-beige bg-canvas/60 hover:bg-beige-light text-charcoal-muted hover:text-charcoal transition-all text-xs"
            title="Search (⌘K)"
          >
            <Search className="w-4 h-4 text-brand" />
            <span className="hidden xl:inline">Search records...</span>
            <kbd className="hidden lg:inline px-1.5 py-0.5 rounded bg-white text-[10px] font-mono border border-beige text-charcoal-muted font-medium">
              ⌘K
            </kbd>
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => setNotificationOpen(true)}
            className="relative p-2.5 rounded-xl border border-beige bg-white hover:bg-canvas transition-colors text-charcoal group"
            title="Notification Center"
          >
            <Bell className="w-4 h-4 text-charcoal-soft group-hover:text-brand transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Help Button */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="hidden sm:flex p-2.5 rounded-xl border border-beige bg-white hover:bg-canvas transition-colors text-charcoal group"
            title="Operations Help"
          >
            <HelpCircle className="w-4 h-4 text-charcoal-soft group-hover:text-brand transition-colors" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-beige-light transition-colors"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Staff account"
                className="w-8 h-8 rounded-xl object-cover border border-beige"
              />
            </button>

            {isProfileMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-dropdown border border-beige p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-beige/60">
                  <p className="text-xs font-semibold text-charcoal">{staffName}</p>
                  <p className="text-[11px] text-charcoal-muted truncate">{staffEmail}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-700">Online • Active Shift</span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-charcoal hover:bg-canvas rounded-xl transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-brand" /> Restaurant Settings
                  </Link>
                  <Link
                    to="/settings?tab=account"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-charcoal hover:bg-canvas rounded-xl transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-brand" /> Security & Credentials
                  </Link>
                  <a
                    href={settings.profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-charcoal hover:bg-canvas rounded-xl transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand" /> Customer Web Menu
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Modals */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  )
}

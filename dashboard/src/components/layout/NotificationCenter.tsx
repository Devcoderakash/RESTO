import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingBag,
  Package,
  Receipt,
  Star,
  Info,
  Clock,
  X,
} from 'lucide-react'
import { useNotificationStore } from '../../store/useNotificationStore'
import { formatTime } from '../../lib/utils'

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate()
  const { notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead, clearAll } =
    useNotificationStore()
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.isRead
    return true
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-blue-600" />
      case 'inventory':
        return <Package className="w-4 h-4 text-rose-600" />
      case 'bill':
        return <Receipt className="w-4 h-4 text-amber-600" />
      case 'review':
        return <Star className="w-4 h-4 text-brand" />
      default:
        return <Info className="w-4 h-4 text-charcoal-muted" />
    }
  }

  const handleItemClick = (targetUrl?: string, id?: string) => {
    if (id) markAsRead(id)
    setIsOpen(false)
    if (targetUrl) {
      navigate(targetUrl)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-sidebar/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm sm:max-w-md bg-white shadow-2xl flex flex-col z-10 border-l border-beige animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-beige flex items-center justify-between bg-canvas/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 text-brand">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-charcoal">Notifications</h3>
              <p className="text-xs text-charcoal-muted">
                {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-charcoal-muted hover:text-charcoal hover:bg-beige-light transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar & Actions */}
        <div className="px-5 py-3 border-b border-beige flex items-center justify-between bg-white text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                activeFilter === 'all'
                  ? 'bg-charcoal text-white'
                  : 'text-charcoal-muted hover:bg-canvas'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                activeFilter === 'unread'
                  ? 'bg-charcoal text-white'
                  : 'text-charcoal-muted hover:bg-canvas'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-brand hover:text-brand-dark transition-colors font-medium"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Read all
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-charcoal-muted hover:text-rose-600 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto divide-y divide-beige/60">
          {filteredNotifications.length === 0 ? (
            <div className="p-10 text-center text-charcoal-muted flex flex-col items-center">
              <Bell className="w-8 h-8 text-beige-dark mb-2 stroke-1" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-charcoal-muted/80 mt-1">
                You are completely up to date with restaurant alerts.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif.targetUrl, notif.id)}
                className={`p-4 flex gap-3.5 transition-colors cursor-pointer hover:bg-canvas/60 ${
                  !notif.isRead ? 'bg-brand-50/25' : 'bg-white'
                }`}
              >
                <div className="mt-0.5 w-8 h-8 rounded-xl bg-canvas border border-beige flex items-center justify-center shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-xs sm:text-sm font-medium truncate ${
                        !notif.isRead ? 'text-charcoal font-semibold' : 'text-charcoal/80'
                      }`}
                    >
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-charcoal-muted mt-1 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-charcoal-muted mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(notif.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


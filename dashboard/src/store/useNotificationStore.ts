import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { NotificationItem } from '../types'

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => void
  resetNotifications: () => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isOpen: false,
      setIsOpen: (open) => set({ isOpen: open }),
      markAsRead: (id) => {
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          )
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          }
        })
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }))
      },
      clearNotification: (id) => {
        set((state) => {
          const updated = state.notifications.filter((n) => n.id !== id)
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          }
        })
      },
      clearAll: () => set({ notifications: [], unreadCount: 0 }),
      addNotification: (data) => {
        const id = `notif-${Date.now()}`
        const newItem: NotificationItem = {
          ...data,
          id,
          timestamp: new Date().toISOString(),
          isRead: false,
        }
        set((state) => {
          const updated = [newItem, ...state.notifications]
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.isRead).length,
          }
        })
      },
      resetNotifications: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),
    }),
    {
      name: 'dineflow_notifications_store',
    }
  )
)


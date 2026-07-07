import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Notification } from '@/types'

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: true,
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    // Real-time listener — only fetch user's own notifications, latest first
    // Limit to 50 to reduce reads
    const ref = collection(db, COLLECTIONS.NOTIFICATIONS)
    const q = query(
      ref,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.slice(0, 50).map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Notification[]
      setNotifications(data)
      setLoading(false)
    })

    return unsubscribe
  }, [user])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}

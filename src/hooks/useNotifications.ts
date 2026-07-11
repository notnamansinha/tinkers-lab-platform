import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Notification } from '@/types'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

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

  return { notifications, unreadCount, loading }
}

import { Button } from '@/components/ui/button'
import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, updateDoc, writeBatch, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const { notifications, loading } = useNotifications()
  const qc = useQueryClient()

  const markRead = async (id: string) => {
    const ref = doc(db, COLLECTIONS.NOTIFICATIONS, id)
    await updateDoc(ref, { isRead: true })
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead)
    if (unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach(n => batch.update(doc(db, COLLECTIONS.NOTIFICATIONS, n.id), { isRead: true }))
    await batch.commit()
    toast.success('All marked as read')
  }

  return (
    <div className="space-y-5 max-w-2xl animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Notifications</p>
          <h1 className="text-2xl font-display font-bold mt-1">Notifications</h1>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button variant="link" size="sm" onClick={markAllRead} className="gap-1.5 text-xs h-auto p-0">
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-16 rounded-lg border bg-muted animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden divide-y">
          {notifications.map(n => (
            <div
              key={n.id}
              className={cn('px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-muted/30 transition-colors', !n.isRead && 'bg-primary/5')}
              onClick={() => markRead(n.id)}
            >
              <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', n.isRead ? 'bg-transparent' : 'bg-primary')} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', !n.isRead && 'font-semibold')}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(n.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

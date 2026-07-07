import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { updateBookingStatus } from '@/services/firebase/bookings'
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_COLOR = { pending: 'bg-orange-100 text-orange-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600', completed: 'bg-blue-100 text-blue-700' }

export default function AdminBookingsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.BOOKINGS)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    staleTime: 2 * 60 * 1000,
  })

  const filtered = bookings.filter(b => {
    const matchSearch = !search || b.machineName.toLowerCase().includes(search.toLowerCase()) || b.userName?.toLowerCase().includes(search.toLowerCase()) || b.userEmail.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    return matchSearch && matchStatus
  })

  const approve = async (id: string) => {
    await updateBookingStatus(id, 'approved', profile?.displayName || 'Admin')
    toast.success('Booking approved')
    qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
  }

  const reject = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') ?? ''
    await updateBookingStatus(id, 'rejected', undefined, reason)
    toast.success('Booking rejected')
    qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-accent">Admin · Bookings</p>
        <h1 className="text-2xl font-display font-bold mt-1">All Bookings</h1>
        <p className="text-muted-foreground text-sm">{bookings.length} total · Latest to oldest · Approve or reject pending requests.</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          {['pending','approved','rejected','cancelled','completed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Machine</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Booked By</th>
                  <th className="px-4 py-3 text-left">Purpose</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((b, idx) => (
                  <tr key={b.id} className={cn('hover:bg-muted/30', b.status === 'pending' && 'bg-orange-50/50')}>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{filtered.length - idx}</td>
                    <td className="px-4 py-2.5 font-medium">{b.machineName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{b.date}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{b.startTime}–{b.endTime}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-medium truncate max-w-36">{b.userName || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-36">{b.userEmail}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-48 truncate">{b.purpose}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status] || 'bg-gray-100'}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {b.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => approve(b.id)} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200" title="Approve"><CheckCircle size={14} /></button>
                          <button onClick={() => reject(b.id)} className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200" title="Reject"><XCircle size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t">
              {filtered.length} of {bookings.length} bookings · Latest first · Pending rows highlighted
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

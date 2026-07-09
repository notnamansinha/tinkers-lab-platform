import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, COLLECTIONS.BOOKINGS), orderBy('createdAt', 'desc')))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    staleTime: 2 * 60 * 1000,
  })

  const filtered = bookings.filter(b => {
    const matchSearch = !search || b.machineName.toLowerCase().includes(search.toLowerCase()) || b.userName?.toLowerCase().includes(search.toLowerCase()) || b.userEmail.toLowerCase().includes(search.toLowerCase())
    return matchSearch && (filterStatus === 'all' || b.status === filterStatus)
  })
  // ponytail: kept reject since admin might still reject approved bookings manually

  const reject = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') ?? ''
    await updateBookingStatus(id, 'rejected', { rejectionReason: reason })
    toast.success('Booking rejected')
    qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-accent">Admin · Bookings</p>
        <h1 className="text-2xl font-display font-bold mt-1">All Bookings</h1>
        <p className="text-muted-foreground text-sm">{bookings.length} total · Latest to oldest</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings…" className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none">
          <option value="all">All statuses</option>
          {['pending','approved','rejected','cancelled','completed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Booked By</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b, idx) => (
                  <TableRow key={b.id}>
                    <TableCell>{filtered.length - idx}</TableCell>
                    <TableCell>{b.machineName}</TableCell>
                    <TableCell>{b.date}</TableCell>
                    <TableCell>{b.startTime}–{b.endTime}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium truncate max-w-36">{b.userName || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-36">{b.userEmail}</div>
                    </TableCell>
                    <TableCell>{b.purpose}</TableCell>
                    <TableCell>{formatDateTime(b.createdAt)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status] || 'bg-gray-100'}`}>{b.status}</span>
                    </TableCell>
                    <TableCell>
                       {b.status === 'approved' && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => reject(b.id)}><XCircle size={14} /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t">
              {filtered.length} of {bookings.length} bookings · Latest first · Pending rows highlighted
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import { cn, todayStr } from '@/lib/utils'
import type { Booking } from '@/types'
import { updateBookingStatus } from '@/services/firebase/bookings'
import { toast } from 'sonner'

function getWeekDays(startDate: Date): string[] {
  const days = []
  const d = new Date(startDate)
  d.setDate(d.getDate() - d.getDay() + 1) // Monday
  for (let i = 0; i < 7; i++) {
    days.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

const HOURS = Array.from({ length: 12 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

export default function BookingCalendarPage() {
  const { isStaff, isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    return d
  })

  const weekDays = getWeekDays(weekStart)

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ['bookings', 'week', weekDays[0]],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.BOOKINGS)
      const q = query(
        ref,
        where('date', '>=', weekDays[0]),
        where('date', '<=', weekDays[6]),
        where('status', 'in', ['pending', 'approved']),
        orderBy('date', 'asc'),
        orderBy('startTime', 'asc'),
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    staleTime: 2 * 60 * 1000,
  })

  const { data: myBookings = [] } = useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.BOOKINGS)
      const q = query(ref, where('userId', '==', user!.uid), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const handleApprove = async (bookingId: string, approverName: string) => {
    try {
      await updateBookingStatus(bookingId, 'approved', approverName)
      toast.success('Booking approved')
      refetch()
    } catch { toast.error('Failed to approve') }
  }

  const handleReject = async (bookingId: string) => {
    const reason = window.prompt('Rejection reason (optional):') ?? ''
    try {
      await updateBookingStatus(bookingId, 'rejected', undefined, reason)
      toast.success('Booking rejected')
      refetch()
    } catch { toast.error('Failed to reject') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Bookings</p>
          <h1 className="text-2xl font-display font-bold mt-1">Equipment Bookings</h1>
        </div>
        <Link to="/bookings/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 shrink-0">
          <Plus size={16} /> New Booking
        </Link>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-3 bg-card border rounded-lg px-4 py-3">
        <button onClick={prevWeek} className="p-1 rounded hover:bg-muted"><ChevronLeft size={18} /></button>
        <span className="font-medium text-sm flex-1 text-center">
          {new Date(weekDays[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} —
          {new Date(weekDays[6]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <button onClick={nextWeek} className="p-1 rounded hover:bg-muted"><ChevronRight size={18} /></button>
        <button onClick={() => setWeekStart((() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d })())} className="text-xs text-primary hover:underline">Today</button>
      </div>

      {/* Pending approvals (staff) */}
      {isStaff && bookings.filter(b => b.status === 'pending').length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 overflow-hidden">
          <div className="px-5 py-3 border-b border-orange-200">
            <h2 className="font-display font-semibold text-orange-800 text-sm flex items-center gap-2"><Clock size={14} /> Pending Approvals ({bookings.filter(b => b.status === 'pending').length})</h2>
          </div>
          <div className="divide-y divide-orange-100">
            {bookings.filter(b => b.status === 'pending').map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{b.machineName}</p>
                  <p className="text-xs text-orange-600">{b.date} · {b.startTime}–{b.endTime}</p>
                  <p className="text-xs text-muted-foreground">{b.userName || b.userEmail} · {b.purpose}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(b.id, 'Staff')} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700">Approve</button>
                  <button onClick={() => handleReject(b.id)} className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My bookings */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b"><h2 className="font-display font-semibold">My Bookings</h2></div>
        {myBookings.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">No bookings yet. <Link to="/bookings/new" className="text-primary hover:underline">Make your first booking →</Link></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Machine</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Purpose</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {myBookings.map(b => (
                  <tr key={b.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{b.machineName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{b.date}</td>
                    <td className="px-4 py-3 font-mono text-xs">{b.startTime}–{b.endTime}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-48 truncate">{b.purpose}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                        b.status === 'approved' ? 'bg-green-100 text-green-700' :
                        b.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        b.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      )}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/bookings/${b.id}`} className="text-xs text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* This week's schedule */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b"><h2 className="font-display font-semibold">This Week's Schedule</h2></div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 text-xs font-mono min-w-[700px]">
            <div className="col-span-1 border-r p-2" />
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => (
              <div key={day} className={cn('p-2 text-center border-r font-semibold', weekDays[i] === todayStr() && 'bg-primary/10 text-primary')}>
                <div>{day}</div>
                <div className="text-muted-foreground">{new Date(weekDays[i]).getDate()}</div>
              </div>
            ))}
            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <div className="col-span-1 border-r border-t p-1 text-[10px] text-muted-foreground">{hour}</div>
                {weekDays.map(day => {
                  const slotBookings = bookings.filter(b => b.date === day && b.startTime <= hour && b.endTime > hour)
                  return (
                    <div key={day} className={cn('border-r border-t p-0.5 min-h-8 relative', weekDays.indexOf(day) + 1 === new Date().getDay() && 'bg-primary/5')}>
                      {slotBookings.map(b => (
                        <div key={b.id} className={cn('text-[9px] px-1 rounded truncate', b.status === 'approved' ? 'bg-green-200 text-green-900' : 'bg-orange-200 text-orange-900')}>
                          {b.machineName}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

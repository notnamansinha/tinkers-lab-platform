import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, FileText } from 'lucide-react'
import { cn, todayStr } from '@/lib/utils'
import type { Booking } from '@/types'
import { updateBookingStatus } from '@/services/firebase/bookings'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
    <div className="space-y-6 container py-6 mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment Bookings</h1>
          <p className="text-muted-foreground mt-1">Reserve machines and view the lab schedule.</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => navigate('/bookings/new')}>
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      {/* Week navigator */}
      <Card className="flex items-center gap-3 px-4 py-2">
        <Button variant="ghost" size="icon" onClick={prevWeek}><ChevronLeft className="h-5 w-5" /></Button>
        <div className="font-medium text-sm flex-1 text-center flex flex-col sm:block">
          <span>{new Date(weekDays[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
          <span className="hidden sm:inline mx-2">—</span>
          <span>{new Date(weekDays[6]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={nextWeek}><ChevronRight className="h-5 w-5" /></Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setWeekStart((() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d })())} 
          className="ml-2 hidden sm:flex"
        >
          Today
        </Button>
      </Card>

      {/* Pending approvals (staff) */}
      {isStaff && bookings.filter(b => b.status === 'pending').length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50/50 dark:bg-orange-950/20 rounded-t-lg">
            <CardTitle className="text-orange-800 dark:text-orange-500 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pending Approvals ({bookings.filter(b => b.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-orange-100 dark:divide-orange-900/30">
              {bookings.filter(b => b.status === 'pending').map(b => (
                <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{b.machineName}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-mono">{b.date} · {b.startTime}–{b.endTime}</p>
                    <p className="text-xs text-muted-foreground">{b.userName || b.userEmail} · {b.purpose}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(b.id, 'Staff')} className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(b.id)}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My bookings */}
      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
          <CardDescription>Your personal machine reservations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {myBookings.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm flex flex-col items-center gap-3 border-t sm:border-t-0">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p>No bookings yet.</p>
              <Button variant="link" onClick={() => navigate('/bookings/new')}>Make your first booking</Button>
            </div>
          ) : (
            <Table className="border-t sm:border-t-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead className="hidden md:table-cell">Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myBookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.machineName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div>{b.date}</div>
                      <div>{b.startTime}–{b.endTime}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{b.purpose}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === 'approved' ? 'default' : b.status === 'pending' ? 'secondary' : b.status === 'rejected' ? 'destructive' : 'outline'} className="capitalize">
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/bookings/${b.id}`)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* This week's schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Lab machine availability for the selected week.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto border-t">
            <div className="grid grid-cols-8 text-xs font-mono min-w-[800px]">
              <div className="col-span-1 border-r p-2 bg-muted/30" />
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => (
                <div key={day} className={cn('p-3 text-center border-r font-semibold flex flex-col gap-1', weekDays[i] === todayStr() ? 'bg-primary/10 text-primary' : 'bg-muted/30')}>
                  <div>{day}</div>
                  <div className="text-muted-foreground">{new Date(weekDays[i]).getDate()}</div>
                </div>
              ))}
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="col-span-1 border-r border-t p-2 text-[10px] text-muted-foreground bg-muted/10">{hour}</div>
                  {weekDays.map(day => {
                    const slotBookings = bookings.filter(b => b.date === day && b.startTime <= hour && b.endTime > hour)
                    return (
                      <div key={day} className={cn('border-r border-t p-1 min-h-[40px] relative flex flex-col gap-1', weekDays.indexOf(day) + 1 === new Date().getDay() && 'bg-primary/5')}>
                        {slotBookings.map(b => (
                          <div key={b.id} className={cn('text-[9px] px-1.5 py-0.5 rounded truncate font-sans font-medium', b.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300')}>
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
        </CardContent>
      </Card>
    </div>
  )
}

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { cn, todayStr } from '@/lib/utils'
import type { Booking } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function getWeekDays(startDate: Date): string[] {
  const days = []
  const date = new Date(startDate)
  date.setDate(date.getDate() - date.getDay() + 1)

  for (let index = 0; index < 7; index += 1) {
    days.push(date.toISOString().slice(0, 10))
    date.setDate(date.getDate() + 1)
  }

  return days
}

const HOURS = Array.from({ length: 12 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`)

export default function BookingCalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - date.getDay() + 1)
    return date
  })

  const weekDays = getWeekDays(weekStart)

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', 'week', weekDays[0]],
    queryFn: async () => {
      const reference = collection(db, COLLECTIONS.BOOKINGS)
      const bookingQuery = query(
        reference,
        where('date', '>=', weekDays[0]),
        where('date', '<=', weekDays[6]),
        where('status', 'in', ['pending', 'approved']),
        orderBy('date', 'asc'),
        orderBy('startTime', 'asc'),
      )
      const snapshot = await getDocs(bookingQuery)
      return snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as Booking)
    },
    staleTime: 2 * 60 * 1000,
  })

  const { data: myBookings = [] } = useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: async () => {
      const reference = collection(db, COLLECTIONS.BOOKINGS)
      const bookingQuery = query(reference, where('userId', '==', user!.uid), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(bookingQuery)
      return snapshot.docs.map(document => ({ id: document.id, ...document.data() }) as Booking)
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const shiftWeek = (days: number) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + days)
    setWeekStart(date)
  }

  const showCurrentWeek = () => {
    const date = new Date()
    date.setDate(date.getDate() - date.getDay() + 1)
    setWeekStart(date)
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="tl-panel-indigo rounded-[16px] p-6 lg:p-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl lg:text-5xl font-black uppercase leading-[0.95]">Equipment Bookings</h1>
          <p className="mt-3 max-w-md font-bold text-white/70">Reserve machines and view the lab schedule.</p>
        </div>
        <Button className="tl-pill-button shrink-0 gap-2" onClick={() => navigate('/bookings/new')}>
          <Plus className="h-4 w-4" /> New Booking
        </Button>
      </div>

      <Card className="tl-panel-cream flex flex-row items-center gap-3 px-4 py-3 text-black">
        <Button aria-label="Previous week" variant="ghost" size="icon" onClick={() => shiftWeek(-7)} className="rounded-full hover:bg-black/10">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-1 flex-col text-center text-sm font-black uppercase tracking-[0.08em] sm:block">
          <span>{new Date(weekDays[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
          <span className="hidden sm:inline mx-2">-</span>
          <span>{new Date(weekDays[6]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <Button aria-label="Next week" variant="ghost" size="icon" onClick={() => shiftWeek(7)} className="rounded-full hover:bg-black/10">
          <ChevronRight className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={showCurrentWeek} className="ml-2 hidden rounded-full border-black/20 bg-black/5 font-black uppercase tracking-[0.08em] text-black hover:bg-black/10 sm:flex">
          Today
        </Button>
      </Card>

      <Card className="tl-panel-cream text-black">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="font-display text-2xl font-black uppercase">My Bookings</CardTitle>
          <CardDescription className="font-bold text-black/55">Your personal machine reservations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {myBookings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 border-t py-10 text-center text-sm text-muted-foreground sm:border-t-0">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
              <p>No bookings yet.</p>
              <Button variant="link" className="font-black text-pink" onClick={() => navigate('/bookings/new')}>Make your first booking</Button>
            </div>
          ) : (
            <Table className="border-t sm:border-t-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead className="hidden md:table-cell">Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {myBookings.map(booking => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.machineName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div>{booking.date}</div>
                      <div>{booking.startTime} - {booking.endTime}</div>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">{booking.purpose}</TableCell>
                    <TableCell>
                      <Badge variant={booking.status === 'approved' ? 'default' : booking.status === 'rejected' ? 'destructive' : booking.status === 'cancelled' ? 'outline' : 'secondary'} className="capitalize">
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/bookings/${booking.id}`)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="tl-panel-cream text-black">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="font-display text-2xl font-black uppercase">Schedule</CardTitle>
          <CardDescription className="font-bold text-black/55">Lab machine availability for the selected week.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden p-0">
          <div className="overflow-x-auto border-t-2 border-black/10">
            <div className="grid min-w-[800px] grid-cols-8 font-mono text-xs">
              <div className="col-span-1 border-r border-black/10 bg-black/5 p-2" />
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className={cn('flex flex-col gap-1 border-r border-black/10 p-3 text-center font-black uppercase tracking-[0.08em]', weekDays[index] === todayStr() ? 'bg-pink/20 text-black' : 'bg-black/5')}>
                  <div>{day}</div>
                  <div className="text-black/45">{new Date(weekDays[index]).getDate()}</div>
                </div>
              ))}
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="col-span-1 border-r border-t border-black/10 bg-black/5 p-2 text-[10px] text-black/45">{hour}</div>
                  {weekDays.map(day => {
                    const slotBookings = bookings.filter(booking => booking.date === day && booking.startTime <= hour && booking.endTime > hour)
                    return (
                      <div key={day} className={cn('relative flex min-h-[40px] flex-col gap-1 border-r border-t border-black/10 p-1', weekDays.indexOf(day) + 1 === new Date().getDay() && 'bg-pink/10')}>
                        {slotBookings.map(booking => (
                          <div key={booking.id} className={cn('truncate rounded-full px-1.5 py-0.5 font-sans text-[9px] font-black', booking.status === 'approved' ? 'bg-lime text-black' : 'bg-orange text-black')}>
                            {booking.machineName}
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

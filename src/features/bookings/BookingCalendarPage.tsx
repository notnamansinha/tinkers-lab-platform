import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collectionGroup, getDocs, orderBy, query, where } from 'firebase/firestore'
import { ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { cn, todayStr } from '@/lib/utils'
import type { Booking } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { DataPanel } from '@/components/common/DataPanel'

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  return d
}

function getWeekDays(startDate: Date): string[] {
  const days = []
  const date = startOfWeek(startDate)

  for (let index = 0; index < 7; index += 1) {
    days.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)
    date.setDate(date.getDate() + 1)
  }

  return days
}

const HOURS = Array.from({ length: 12 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`)

export default function BookingCalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const weekDays = getWeekDays(weekStart)

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', 'week', weekDays[0]],
    queryFn: async () => {
      const reference = collectionGroup(db, 'bookings')
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

  const { data: myBookings = [], isLoading: myBookingsLoading } = useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: async () => {
      const reference = collectionGroup(db, 'bookings')
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
    setWeekStart(startOfWeek(new Date()))
  }

  return (
    <div className="mx-auto mt-2 w-full max-w-[1440px] min-w-0 space-y-5 animate-fade-in sm:space-y-6">
      <PageHeader
        variant="dark"
        title="Bookings & Calendar"
        description="Reserve machines, manage slot requests, and view the lab schedule."
        action={
          <button
            onClick={() => navigate('/bookings/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lime text-black font-bold text-xs hover:bg-lime/90 transition-all shadow-sm shrink-0"
          >
            <Plus size={16} /> New Booking
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-near-black p-3 text-white shadow-sm sm:p-4">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Previous week"
            variant="ghost"
            size="icon"
            onClick={() => shiftWeek(-7)}
            className="h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Next week"
            variant="ghost"
            size="icon"
            onClick={() => shiftWeek(7)}
            className="h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="order-3 w-full text-center text-xs font-bold tracking-tight text-white sm:order-none sm:w-auto sm:text-sm">
          <span>{new Date(weekDays[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
          <span className="mx-2 text-white/30">—</span>
          <span>{new Date(weekDays[6] + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={showCurrentWeek}
          className="rounded-full border border-hairline bg-white/5 text-white/80 hover:text-white hover:bg-white/10 text-xs font-bold px-4 h-8"
        >
          Today
        </Button>
      </div>

      <DataPanel title="My Bookings" description="Your personal machine reservations.">
        {myBookingsLoading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-xs text-white/40">
            Loading your bookings…
          </div>
        ) : myBookings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-xs text-white/40">
            <FileText className="h-8 w-8 opacity-30" />
            <p>No bookings yet.</p>
            <button onClick={() => navigate('/bookings/new')} className="font-bold text-lime hover:underline">
              Make your first booking
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-hairline bg-near-black">
            <Table>
              <TableHeader className="bg-white/[0.03]">
                <TableRow className="border-hairline hover:bg-transparent">
                  <TableHead className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Machine</TableHead>
                  <TableHead className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Date &amp; Time</TableHead>
                  <TableHead className="hidden md:table-cell text-white/40 text-[10px] uppercase font-bold tracking-widest">Purpose</TableHead>
                  <TableHead className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-hairline">
                {myBookings.map(booking => (
                  <TableRow key={booking.id} className="border-hairline hover:bg-white/[0.04] transition-colors">
                    <TableCell className="font-bold text-white text-xs sm:text-sm">{booking.machineName}</TableCell>
                    <TableCell className="text-xs text-white/60">
                      <div className="font-bold text-white">{booking.date}</div>
                      <div className="text-white/50 text-[11px]">{booking.startTime} - {booking.endTime}</div>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-white/60 md:table-cell text-xs">{booking.purpose}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "capitalize font-bold text-[9px] tracking-wider border",
                          booking.status === 'approved' ? "bg-lime/15 text-lime border-lime/30" :
                          booking.status === 'rejected' ? "bg-pink/15 text-pink border-pink/30" :
                          booking.status === 'cancelled' ? "bg-white/10 text-white/50 border-hairline" :
                          "bg-orange/15 text-orange border-orange/30"
                        )}
                      >
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                        className="text-white/40 hover:text-white hover:bg-white/10 rounded-full text-xs"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DataPanel>

      <DataPanel title="Weekly Schedule" description="Lab machine availability for the selected week.">
        <div className="overflow-x-auto rounded-xl border border-hairline bg-near-black">
          <div className="grid min-w-[800px] grid-cols-8 text-xs">
            <div className="col-span-1 border-r border-hairline bg-white/[0.02] p-2" />
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <div
                key={day}
                className={cn(
                  'flex flex-col gap-0.5 border-r border-hairline p-3 text-center tracking-wider',
                  weekDays[index] === todayStr() ? 'bg-lime/10 text-lime font-bold' : 'bg-white/[0.02] text-white/50'
                )}
              >
                <div className="uppercase font-bold text-[10px]">{day}</div>
                <div className="text-white font-extrabold text-sm">{new Date(weekDays[index] + 'T00:00:00').getDate()}</div>
              </div>
            ))}
            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <div className="col-span-1 border-r border-t border-hairline bg-white/[0.01] p-2.5 text-[10px] text-white/40 font-mono flex items-center justify-center tracking-wider">
                  {hour}
                </div>
                {weekDays.map((day, index) => {
                  const slotBookings = bookings.filter(booking => booking.date === day && booking.startTime <= hour && booking.endTime > hour)
                  return (
                    <div
                      key={day}
                      className={cn(
                        'relative flex min-h-[48px] flex-col gap-1 border-r border-t border-hairline p-1.5',
                        weekDays[index] === todayStr() ? 'bg-white/[0.02]' : ''
                      )}
                    >
                      {slotBookings.map(booking => (
                        <div
                          key={booking.id}
                          className={cn(
                            'truncate rounded-md px-2 py-1 text-[9px] font-bold tracking-wide border',
                            booking.status === 'approved'
                              ? 'bg-lime/15 text-lime border-lime/30'
                              : 'bg-orange/15 text-orange border-orange/30'
                          )}
                        >
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
      </DataPanel>
    </div>
  )
}

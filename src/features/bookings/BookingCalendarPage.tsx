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
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { DataPanel } from '@/components/common/DataPanel'

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
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in space-y-6 mt-4">
      <PageHeader
        variant="dark"
        title="Bookings"
        description="Reserve machines and view the lab schedule."
        action={
          <button onClick={() => navigate('/bookings/new')} className="tl-pill-button-secondary flex items-center gap-2 px-6 shrink-0">
            <Plus size={18} /> New Booking
          </button>
        }
      />

      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] flex flex-row items-center gap-4 px-5 py-4 text-white rounded-[24px]">
        <Button aria-label="Previous week" variant="ghost" size="icon" onClick={() => shiftWeek(-7)} className="rounded-full hover:bg-[rgba(255,255,255,0.1)] text-white/70">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-1 flex-col text-center text-[14px] font-semibold tracking-wide sm:block">
          <span>{new Date(weekDays[0]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
          <span className="hidden sm:inline mx-3 text-white/30">—</span>
          <span>{new Date(weekDays[6]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <Button aria-label="Next week" variant="ghost" size="icon" onClick={() => shiftWeek(7)} className="rounded-full hover:bg-[rgba(255,255,255,0.1)] text-white/70">
          <ChevronRight className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={showCurrentWeek} className="ml-3 hidden rounded-full border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[rgba(255,255,255,0.1)] sm:flex">
          Today
        </Button>
      </div>

      <DataPanel title="My Bookings" description="Your personal machine reservations.">
          {myBookings.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center text-[14px] text-white/30">
              <FileText className="h-10 w-10 opacity-20 mb-2" />
              <p>No bookings yet.</p>
              <button onClick={() => navigate('/bookings/new')} className="font-semibold text-[#514AF1] hover:text-[#EC68D8] transition-colors">Make your first booking</button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.05)]">
              <Table>
                <TableHeader className="bg-[rgba(255,255,255,0.02)]">
                  <TableRow className="border-[rgba(255,255,255,0.05)] hover:bg-transparent">
                    <TableHead className="text-white/40">Machine</TableHead>
                    <TableHead className="text-white/40">Date &amp; Time</TableHead>
                    <TableHead className="hidden md:table-cell text-white/40">Purpose</TableHead>
                    <TableHead className="text-white/40">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBookings.map(booking => (
                    <TableRow key={booking.id} className="border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <TableCell className="font-medium text-white">{booking.machineName}</TableCell>
                      <TableCell className="text-[12px] text-white/60">
                        <div className="text-white/80">{booking.date}</div>
                        <div className="text-white/40">{booking.startTime} - {booking.endTime}</div>
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] truncate text-white/50 md:table-cell text-[13px]">{booking.purpose}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "capitalize font-medium text-[10px] tracking-wider border-0",
                            booking.status === 'approved' ? "bg-[rgba(221,242,55,0.15)] text-[#DDF237]" :
                            booking.status === 'rejected' ? "bg-[rgba(236,104,216,0.15)] text-[#EC68D8]" :
                            booking.status === 'cancelled' ? "bg-[rgba(255,255,255,0.1)] text-white/60" :
                            "bg-[rgba(81,74,241,0.2)] text-[#9B97F7]"
                          )}
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/bookings/${booking.id}`)} className="text-white/50 hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-full">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </DataPanel>

      <DataPanel title="Schedule" description="Lab machine availability for the selected week.">
          <div className="overflow-x-auto rounded-[16px] border border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]">
            <div className="grid min-w-[800px] grid-cols-8 text-[11px]">
              <div className="col-span-1 border-r border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-2" />
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div key={day} className={cn('flex flex-col gap-1 border-r border-[rgba(255,255,255,0.05)] p-3 text-center tracking-widest', weekDays[index] === todayStr() ? 'bg-[rgba(81,74,241,0.15)] text-[#9B97F7]' : 'bg-[rgba(255,255,255,0.02)] text-white/40')}>
                  <div className="uppercase font-semibold">{day}</div>
                  <div className="text-white/60 font-medium text-[13px]">{new Date(weekDays[index]).getDate()}</div>
                </div>
              ))}
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="col-span-1 border-r border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] p-3 text-[10px] text-white/30 font-medium flex items-center justify-center tracking-wider">{hour}</div>
                  {weekDays.map(day => {
                    const slotBookings = bookings.filter(booking => booking.date === day && booking.startTime <= hour && booking.endTime > hour)
                    return (
                      <div key={day} className={cn('relative flex min-h-[50px] flex-col gap-1.5 border-r border-t border-[rgba(255,255,255,0.05)] p-1.5', weekDays.indexOf(day) + 1 === new Date().getDay() && 'bg-[rgba(81,74,241,0.05)]')}>
                        {slotBookings.map(booking => (
                          <div key={booking.id} className={cn('truncate rounded-[6px] px-2 py-1 text-[9px] font-semibold tracking-wide border', booking.status === 'approved' ? 'bg-[rgba(221,242,55,0.1)] text-[#DDF237] border-[rgba(221,242,55,0.2)]' : 'bg-[rgba(255,177,63,0.1)] text-[#FFB13F] border-[rgba(255,177,63,0.2)]')}>
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

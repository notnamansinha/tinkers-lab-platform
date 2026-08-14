import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { AlertTriangle, Box, CalendarDays, MessageSquare, Wrench, Bell } from 'lucide-react'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveUserCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { getUserProjects } from '@/services/firebase/projects'
import type { Booking, Equipment, Announcement } from '@/types'
import { todayStr, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TabularStatOverview, RoundedBarChart, StepsPanel } from '@/components/visual'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = todayStr()

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', 'all-dashboard'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, COLLECTIONS.EQUIPMENT))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: todayBookings = [] } = useQuery({
    queryKey: ['bookings', 'today', user?.uid],
    queryFn: async () => {
      const q = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('userId', '==', user!.uid),
        where('date', '==', today),
      )
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    enabled: Boolean(user),
  })

  const { data: activeCheckouts = [] } = useQuery({
    queryKey: ['toolCheckouts', 'active', user?.uid],
    queryFn: () => getActiveUserCheckouts(user!.uid),
    enabled: Boolean(user),
  })

  const { data: userProjects = [] } = useQuery({
    queryKey: ['projects', 'user', user?.uid],
    queryFn: () => getUserProjects(user!.uid),
    enabled: Boolean(user),
  })

  const { data: upcomingBookings = [] } = useQuery({
    queryKey: ['bookings', 'upcoming', user?.uid],
    queryFn: async () => {
      const today = todayStr()
      const nowTime = new Date().toTimeString().slice(0, 5)
      const q = query(
        collection(db, COLLECTIONS.BOOKINGS),
        where('userId', '==', user!.uid),
        where('date', '>=', today),
      )
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
      return list
        .filter(b => {
          if (b.status === 'cancelled') return false
          if (b.date === today && b.endTime < nowTime) return false
          return true
        })
        .sort((a, b) => {
          const dateDiff = a.date.localeCompare(b.date)
          if (dateDiff !== 0) return dateDiff
          return a.startTime.localeCompare(b.startTime)
        })
        .slice(0, 3)
    },
    enabled: Boolean(user),
  })

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: async () => {
      const q = query(
        collection(db, COLLECTIONS.ANNOUNCEMENTS),
        where('isActive', '==', true),
      )
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Announcement)
      const priorityWeight = { urgent: 3, high: 2, normal: 1 }
      return list
        .sort((a, b) => {
          const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 1
          const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 1
          if (weightB !== weightA) return weightB - weightA
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        })
        .slice(0, 3)
    },
  })

  const overdueCount = activeCheckouts.filter(isCheckoutOverdue).length
  const availableCount = equipment.filter(item => item.status === 'available').length
  const reservedCount = equipment.filter(item => item.status === 'reserved').length
  const maintenanceCount = equipment.filter(item => item.status === 'under_maintenance').length

  const equipmentStatus = [
    { label: 'Ready', value: availableCount, color: 'lime' as const },
    { label: 'Held', value: reservedCount, color: 'orange' as const },
    { label: 'Care', value: maintenanceCount, color: 'pink' as const },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-5 animate-fade-in sm:gap-6">
      <StepsPanel
        eyebrow="From idea to lab time"
        title="Book equipment. Get approved. Start making."
        steps={[
          { title: 'Choose', description: 'Pick an available machine and connect it to your registered project.' },
          { title: 'Confirm', description: 'Select a slot and accept the machine-specific safety agreement.' },
          { title: 'Build', description: 'Track coordinator approval and arrive ready for your lab session.' },
        ]}
        action={<Button onClick={() => navigate('/bookings/new')}>Book a machine</Button>}
      />

      <section aria-labelledby="lab-overview-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Live lab overview</p>
             <h1 id="lab-overview-title" className="mt-2 text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold tracking-[-0.05em] text-white">
              Your workspace, at a glance.
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/equipment')} className="hidden sm:inline-flex">
            Browse machines
          </Button>
        </div>

        <TabularStatOverview
          items={[
            {
              id: 'machines-ready',
              label: 'Machines ready',
              value: availableCount,
              detail: `${equipment.length} listed in the lab`,
              accent: 'lime',
              icon: Wrench,
              onClick: () => navigate('/equipment'),
            },
            {
              id: 'todays-sessions',
              label: "Today's sessions",
              value: todayBookings.length,
              detail: 'Your confirmed machine time',
              accent: 'pink',
              icon: CalendarDays,
              onClick: () => navigate('/bookings'),
            },
            {
              id: 'tools-checked-out',
              label: 'Tools checked out',
              value: activeCheckouts.length,
              detail: overdueCount ? `${overdueCount} need attention` : 'Everything is on schedule',
              accent: 'orange',
              icon: Box,
              onClick: () => navigate('/checkout/history'),
            },
            {
              id: 'active-projects',
              label: 'Active projects',
              value: userProjects.length,
              detail: 'Projects linked to bookings',
              accent: 'indigo',
              icon: MessageSquare,
              onClick: () => navigate('/projects'),
            },
          ]}
        />
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {/* Your Schedule */}
        <section className="flex min-w-0 flex-col rounded-card border border-hairline bg-charcoal p-5 text-white sm:p-6" aria-labelledby="schedule-title">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Your upcoming sessions</p>
          <h2 id="schedule-title" className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-white">
            Upcoming Schedule
          </h2>
          {upcomingBookings.length === 0 ? (
            <div className="mt-5 flex flex-col items-center justify-center py-5 text-center">
              <p className="text-xs text-white/50">No upcoming bookings scheduled.</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => navigate('/bookings/new')}>
                Book a slot
              </Button>
            </div>
          ) : (
             <div className="mt-5 space-y-2.5">
              {upcomingBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-white truncate">{b.machineName}</p>
                    <p className="text-[10px] text-white/50 truncate">{b.projectTitle}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-bold text-pink">{b.date}</p>
                    <p className="text-[10px] text-white/45">{b.startTime} - {b.endTime}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lab Announcements */}
        <section className="flex min-w-0 flex-col rounded-card border border-hairline bg-charcoal p-5 text-white sm:p-6" aria-labelledby="announcements-title">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Lab notices</p>
          <h2 id="announcements-title" className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-white">
            Announcements
          </h2>
          {announcements.length === 0 ? (
            <div className="mt-5 py-5 text-center text-xs text-white/50">
              No active announcements from the lab coordinators.
            </div>
          ) : (
            <div className="mt-5 space-y-2.5">
              {announcements.map(a => (
                <div key={a.id} className={cn(
                  "rounded-xl p-3 border",
                  a.priority === 'high' ? 'bg-orange/10 border-orange/20 text-orange-400' :
                  a.priority === 'urgent' ? 'bg-pink/15 border-pink/25 text-pink' :
                  'bg-white/5 border-white/5 text-white/80'
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-60 flex items-center gap-1">
                      <Bell size={8} /> {a.priority} priority
                    </span>
                    <span className="text-[9px] text-white/35 truncate">By {a.authorName}</span>
                  </div>
                  <p className="mt-0.5 font-bold text-xs text-white truncate">{a.title}</p>
                  <p className="mt-0.5 text-[11px] text-white/60 line-clamp-2 leading-relaxed">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section className="flex min-w-0 flex-col rounded-card bg-cream p-5 text-black sm:p-6 lg:p-8" aria-labelledby="availability-title">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/50">Current equipment status</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 id="availability-title" className="text-3xl font-extrabold tracking-[-0.04em] text-black">
              Lab availability
            </h2>
            <span className="rounded-full bg-black px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {equipment.length} total
            </span>
          </div>
          <RoundedBarChart
            data={equipmentStatus}
            title="Equipment availability by status"
            description={`${availableCount} ready, ${reservedCount} reserved, and ${maintenanceCount} in maintenance.`}
            trackColor="cream"
             className="mt-5 h-[clamp(12rem,24vw,19rem)]"
          />
        </section>

        <section className={overdueCount > 0 ? 'flex min-w-0 flex-col rounded-card bg-pink p-5 text-black sm:p-6 lg:p-8' : 'flex min-w-0 flex-col rounded-card bg-indigo p-5 text-white sm:p-6 lg:p-8'} aria-labelledby="attention-title">
          <div className={overdueCount > 0 ? 'flex h-11 w-11 items-center justify-center rounded-full bg-black text-pink' : 'flex h-11 w-11 items-center justify-center rounded-full bg-pink text-black'}>
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className={overdueCount > 0 ? 'mt-8 text-[11px] font-bold uppercase tracking-[0.12em] text-black/55' : 'mt-8 text-[11px] font-bold uppercase tracking-[0.12em] text-white/55'}>
            Attention
          </p>
          <h2 id="attention-title" className={overdueCount > 0 ? 'mt-2 text-4xl font-extrabold tracking-[-0.05em] text-black' : 'mt-2 text-4xl font-extrabold tracking-[-0.05em] text-white'}>
            {overdueCount > 0 ? `${overdueCount} overdue ${overdueCount === 1 ? 'tool' : 'tools'}` : 'All clear.'}
          </h2>
          <p className={overdueCount > 0 ? 'mt-4 text-sm font-medium text-black/65' : 'mt-4 text-sm font-medium text-white/65'}>
            {overdueCount > 0 ? 'Return overdue tools before your next booking.' : 'No pending returns or urgent lab actions.'}
          </p>
          <Button
            variant={overdueCount > 0 ? 'outline' : 'default'}
            onClick={() => navigate('/checkout/history')}
             className={overdueCount > 0 ? 'mt-auto border-black/25 text-black hover:bg-black hover:text-white' : 'mt-auto'}
          >
            View checkouts
          </Button>
        </section>
      </div>
    </div>
  )
}

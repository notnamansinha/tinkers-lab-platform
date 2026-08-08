import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { AlertTriangle, Box, CalendarDays, MessageSquare, Wrench } from 'lucide-react'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveUserCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { getUserProjects } from '@/services/firebase/projects'
import type { Booking, Equipment } from '@/types'
import { todayStr } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DarkStatCard, RoundedBarChart, StepsPanel } from '@/components/visual'

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-fade-in">
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
            <h1 id="lab-overview-title" className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-white md:text-5xl">
              Your workspace, at a glance.
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/equipment')} className="hidden sm:inline-flex">
            Browse machines
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={() => navigate('/equipment')} className="text-left">
            <DarkStatCard label="Machines ready" value={availableCount} detail={`${equipment.length} listed in the lab`} accent="lime" icon={Wrench} />
          </button>
          <button type="button" onClick={() => navigate('/bookings')} className="text-left">
            <DarkStatCard label="Today's sessions" value={todayBookings.length} detail="Your confirmed machine time" accent="pink" icon={CalendarDays} />
          </button>
          <button type="button" onClick={() => navigate('/inventory')} className="text-left">
            <DarkStatCard label="Tools checked out" value={activeCheckouts.length} detail={overdueCount ? `${overdueCount} need attention` : 'Everything is on schedule'} accent="orange" icon={Box} />
          </button>
          <button type="button" onClick={() => navigate('/projects')} className="text-left">
            <DarkStatCard label="Active projects" value={userProjects.length} detail="Projects linked to bookings" accent="indigo" icon={MessageSquare} />
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-card bg-cream p-6 text-black md:p-8" aria-labelledby="availability-title">
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
            className="mt-6 max-h-64"
          />
        </section>

        <section className={overdueCount > 0 ? 'rounded-card bg-pink p-6 text-black md:p-8' : 'rounded-card bg-indigo p-6 text-white md:p-8'} aria-labelledby="attention-title">
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
            className={overdueCount > 0 ? 'mt-10 border-black/25 text-black hover:bg-black hover:text-white' : 'mt-10'}
          >
            View checkouts
          </Button>
        </section>
      </div>
    </div>
  )
}

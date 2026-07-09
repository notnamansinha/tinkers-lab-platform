import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveUserCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { getUserProjects } from '@/services/firebase/projects'
import type { Equipment, Booking } from '@/types'
import { cn, todayStr } from '@/lib/utils'
import {
  LayoutDashboard,
  TrendingUp,
  CalendarDays,
  Wrench,
  ChevronRight,
  AlertTriangle,
  Plus,
  Search,
  Bell,
} from 'lucide-react'
import flowerMark from '@/assets/tinkerer-figjam/flower-mark.svg'
import dashboardClusters from '@/assets/tinkerer-figjam/dashboard-clusters.svg'

// ─── Constants ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'bookings',  label: 'Bookings',  icon: CalendarDays,    path: '/bookings' },
  { id: 'tools',     label: 'Tools',     icon: Wrench,          path: '/equipment' },
  { id: 'projects',  label: 'Projects',  icon: TrendingUp,      path: '/projects' },
] as const

const FORM_FIELDS = [
  { id: 'goal',      label: 'MAIN GOAL',           placeholder: 'e.g. Complete PCB prototype' },
  { id: 'budget',    label: 'BUDGET RANGE',        placeholder: 'e.g. ₹5,000 — ₹15,000' },
  { id: 'timeline',  label: 'TIMELINE',            placeholder: 'e.g. 3 months' },
  { id: 'equip',     label: 'PREFERRED EQUIPMENT', placeholder: 'e.g. 3D Printer, Laser Cutter' },
  { id: 'sessions',  label: 'WEEKLY SESSIONS',     placeholder: 'e.g. 2 sessions/week' },
  { id: 'members',   label: 'TEAM SIZE',           placeholder: 'e.g. 4 members' },
] as const

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ activeId }: { activeId: string }) {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const initials = (profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'U')
    .slice(0, 2).toUpperCase()

  return (
    <aside
      className="hidden lg:flex flex-col items-center bg-[#171717] h-screen sticky top-0 flex-shrink-0 py-6"
      style={{ width: 88 }}
      aria-label="Main navigation"
    >
      <button
        onClick={() => navigate('/')}
        className="w-10 h-10 rounded-[10px] overflow-hidden mb-8 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC68D8]"
        aria-label="Dashboard home"
      >
        <img src={flowerMark} alt="" className="w-full h-full" />
      </button>

      <nav className="flex flex-col gap-1 w-full px-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = item.id === activeId
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center w-full h-16 rounded-[10px] gap-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC68D8]',
                isActive
                  ? 'bg-black/40 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              )}
            >
              {isActive && (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-[#DDF237]" />
              )}
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-semibold uppercase tracking-[0.06em] leading-none">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto">
        <div
          className="w-9 h-9 rounded-full bg-[#EC68D8] flex items-center justify-center text-black text-[11px] font-bold select-none"
          title={profile?.displayName || 'User'}
        >
          {initials}
        </div>
      </div>
    </aside>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header() {
  const { profile, user } = useAuth()
  const initials = (profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'U')
    .slice(0, 2).toUpperCase()

  return (
    <header className="flex items-center justify-between px-6 bg-black border-b border-white/5 flex-shrink-0" style={{ height: 56 }}>
      <span className="font-brand text-[#EC68D8] text-2xl leading-none select-none tracking-[-0.01em]">
        tinkerer
      </span>
      <div className="flex items-center gap-3">
        <button className="hidden sm:flex items-center gap-2 bg-[#191919] rounded-[8px] px-3 h-9 text-white/40 text-sm hover:bg-[#222] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#EC68D8]">
          <Search size={14} />
          <span className="hidden md:inline text-[13px]">Search...</span>
        </button>
        <button className="relative w-9 h-9 rounded-[8px] bg-[#191919] flex items-center justify-center text-white/50 hover:text-white hover:bg-[#222] transition-colors focus:outline-none">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EC68D8]" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#EC68D8] flex items-center justify-center text-black text-[11px] font-bold select-none">
          {initials}
        </div>
      </div>
    </header>
  )
}

// ─── Stat Strip ──────────────────────────────────────────────────────────────
function StatStrip({ sessions, checkouts, projects, available, offline }: {
  sessions: number; checkouts: number; projects: number; available: number; offline: number
}) {
  const navigate = useNavigate()
  const stats = [
    { label: 'Sessions Today',   value: sessions,   href: '/bookings',         highlight: false },
    { label: 'Active Checkouts', value: checkouts,  href: '/checkout/history', highlight: checkouts > 0 },
    { label: 'My Projects',      value: projects,   href: '/projects',         highlight: false },
    { label: 'Available Equip.', value: available,  href: '/equipment',        highlight: false },
    { label: 'Offline',          value: offline,    href: '/equipment',        highlight: offline > 0 },
  ]

  return (
    <div className="bg-[#FFF4BE] flex items-stretch flex-shrink-0" style={{ height: 72 }}>
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          <button
            onClick={() => navigate(stat.href)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 px-2 hover:bg-black/5 transition-colors focus:outline-none"
          >
            <span className={cn('font-brand text-3xl leading-none tabular-nums', stat.highlight ? 'text-[#EC68D8]' : 'text-black')}>
              {stat.value}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.07em] text-black/50 leading-none text-center">
              {stat.label}
            </span>
          </button>
          {i < stats.length - 1 && <div className="w-px bg-[#E1D7A8] my-3" />}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Form Panel ──────────────────────────────────────────────────────────────
function FormPanel({ overdueCount }: { overdueCount: number }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<Record<string, string>>({})
  const onChange = (id: string, val: string) => setFormData(p => ({ ...p, [id]: val }))

  return (
    <div className="bg-[#514AF1] flex flex-col overflow-hidden" style={{ borderRadius: 12 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-white text-[13px] font-bold uppercase tracking-[0.1em] leading-none">
          Future Plans
        </h2>
        {overdueCount > 0 && (
          <button
            onClick={() => navigate('/checkout/history')}
            className="flex items-center gap-1.5 bg-[#EC68D8] text-black text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full hover:brightness-110 transition-all"
          >
            <AlertTriangle size={11} />
            {overdueCount} overdue
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3 px-6 pb-4">
        {FORM_FIELDS.map((field, i) => (
          <div key={field.id} className="flex flex-col gap-1">
            <label
              htmlFor={`plan-${field.id}`}
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/60 leading-none"
            >
              {field.label}
            </label>
            <div className="relative">
              <input
                id={`plan-${field.id}`}
                type="text"
                placeholder={field.placeholder}
                value={formData[field.id] || ''}
                onChange={e => onChange(field.id, e.target.value)}
                className={cn(
                  'w-full h-10 bg-[#746EF8] rounded-[6px] px-3 text-white text-sm',
                  'placeholder:text-white/35 outline-none border-2 border-transparent',
                  'focus:border-[#DDF237] focus:bg-[#6A63F0] hover:bg-[#6E68F5] transition-all'
                )}
              />
              {/* Lime dot: shown on focused/filled field */}
              {i === 0 && formData[field.id] && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#DDF237]" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-6 py-5 border-t border-white/10">
        <button
          onClick={() => navigate('/bookings/new')}
          className="flex-1 h-10 bg-[#746EF8] text-white text-[12px] font-bold uppercase tracking-wide rounded-[8px] hover:bg-[#6A63F0] transition-colors focus:outline-none"
        >
          Book Session
        </button>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex-1 h-10 bg-[#EC68D8] text-black text-[12px] font-bold uppercase tracking-wide rounded-[8px] hover:brightness-110 active:scale-[0.98] transition-all focus:outline-none"
        >
          New Project
        </button>
      </div>
    </div>
  )
}

// ─── Capsule (horizontal) bar ─────────────────────────────────────────────────
function CapsuleBar({ segments, height = 24 }: {
  segments: { color: string; flex: number; label?: string }[]
  height?: number
}) {
  return (
    <div className="flex gap-1.5 w-full" style={{ height }}>
      {segments.map((seg, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{ flex: seg.flex, backgroundColor: seg.color, minWidth: 8 }}
          title={seg.label}
        />
      ))}
    </div>
  )
}

// ─── Vertical rounded bar chart ───────────────────────────────────────────────
function BarChart({ bars, height = 120 }: {
  bars: { color: string; value: number; label: string }[]
  height?: number
}) {
  const max = Math.max(...bars.map(b => b.value), 1)
  return (
    <div className="flex items-end gap-[10px] w-full" style={{ height }}>
      {bars.map((bar, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-full transition-all duration-500"
            style={{
              backgroundColor: bar.color,
              height: Math.max(8, (bar.value / max) * (height - 20)),
            }}
          />
          <span className="text-[9px] font-semibold text-[#A9957A] uppercase tracking-[0.04em]">
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Analytics Card ───────────────────────────────────────────────────────────
function AnalyticsCard({ title, children, className }: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('bg-[#FFF4BE] flex flex-col p-6 gap-4', className)} style={{ borderRadius: 12 }}>
      <h3 className="text-black text-[11px] font-bold uppercase tracking-[0.1em] leading-none">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Analytics Stack ──────────────────────────────────────────────────────────
function AnalyticsStack({ equipment, todayBookings, userProjects, activeCheckouts }: {
  equipment: Equipment[]
  todayBookings: Booking[]
  userProjects: { id: string }[]
  activeCheckouts: { id: string }[]
}) {
  const available = equipment.filter(e => e.status === 'available').length
  const inUse     = equipment.filter(e => e.status === 'in_use' || e.status === 'reserved').length
  const offline   = equipment.filter(e => ['under_maintenance','out_of_service','retired'].includes(e.status)).length
  const total     = equipment.length || 1

  const categories = [
    { label: '3D Print',    color: '#FFB13F', count: equipment.filter(e => e.category === 'Digital Fabrication').length },
    { label: 'Electronics', color: '#EC68D8', count: equipment.filter(e => e.category === 'Electronics').length },
    { label: 'Metal/CNC',   color: '#514AF1', count: equipment.filter(e => e.category === 'Heavy Duty').length },
    { label: 'Woodshop',    color: '#DDF237', count: equipment.filter(e => e.category === 'Tabletop Power').length },
    { label: 'Other',       color: '#E1D7A8', count: equipment.filter(e => e.category === 'Other').length },
  ]

  const barData = [
    { color: '#E1D7A8', value: available,               label: 'Avail' },
    { color: '#FFB13F', value: inUse,                   label: 'In Use' },
    { color: '#EC68D8', value: todayBookings.length,    label: 'Today' },
    { color: '#514AF1', value: userProjects.length,     label: 'Proj' },
    { color: '#DDF237', value: activeCheckouts.length,  label: 'Tools' },
    { color: '#A9957A', value: offline,                 label: 'Down' },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* Card 1: Equipment Status — capsule bars (replicates investment-screen.svg layout) */}
      <AnalyticsCard title="Equipment Overview">
        <div className="flex flex-col gap-2">
          <CapsuleBar
            height={24}
            segments={[
              { color: '#E1D7A8', flex: available || 1,  label: `Available: ${available}` },
              { color: '#FFB13F', flex: inUse || 0.01,   label: `In Use: ${inUse}` },
              { color: '#A9957A', flex: offline || 0.01, label: `Offline: ${offline}` },
            ]}
          />
          <CapsuleBar
            height={24}
            segments={categories.map(c => ({ color: c.color, flex: c.count || 0.01, label: `${c.label}: ${c.count}` }))}
          />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { color: '#E1D7A8', label: `Avail (${available})` },
            { color: '#FFB13F', label: `In Use (${inUse})` },
            { color: '#A9957A', label: `Offline (${offline})` },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
              <span className="text-[10px] font-medium text-black/60">{l.label}</span>
            </div>
          ))}
        </div>
      </AnalyticsCard>

      {/* Card 2: Activity breakdown — vertical rounded bars */}
      <AnalyticsCard title="Activity Breakdown">
        <BarChart bars={barData} height={128} />
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {barData.map(b => (
            <div key={b.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
              <span className="text-[10px] font-medium text-black/60">{b.label}: {b.value}</span>
            </div>
          ))}
        </div>
      </AnalyticsCard>

      {/* Card 3: Category distribution — horizontal progress bars */}
      <AnalyticsCard title="Category Distribution">
        <div className="flex flex-col gap-2.5">
          {categories.map(cat => (
            <div key={cat.label} className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-black/50 uppercase tracking-[0.05em] w-16 shrink-0">
                {cat.label}
              </span>
              <div className="flex-1 bg-[#E1D7A8] rounded-full overflow-hidden" style={{ height: 20 }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, (cat.count / total) * 100)}%`, backgroundColor: cat.color }}
                />
              </div>
              <span className="text-[11px] font-bold tabular-nums text-black/70 w-5 text-right">{cat.count}</span>
            </div>
          ))}
        </div>
      </AnalyticsCard>
    </div>
  )
}

// ─── Attention Panel ──────────────────────────────────────────────────────────
function AttentionPanel({ overdueCount, activeCheckouts, todayBookings }: {
  overdueCount: number
  activeCheckouts: { id: string }[]
  todayBookings: Booking[]
}) {
  const navigate = useNavigate()
  if (overdueCount === 0 && activeCheckouts.length === 0 && todayBookings.length === 0) return null

  return (
    <div className="bg-[#EC68D8] flex flex-col p-6 gap-4" style={{ borderRadius: 12 }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-[#EC68D8] shrink-0">
          <AlertTriangle size={14} />
        </div>
        <h3 className="text-black text-[11px] font-bold uppercase tracking-[0.1em] leading-none">
          Attention Required
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {overdueCount > 0 && (
          <button
            onClick={() => navigate('/checkout/history')}
            className="bg-black text-white p-3 rounded-[8px] text-left hover:bg-black/80 transition-colors w-full"
          >
            <p className="text-[#EC68D8] font-bold text-sm">{overdueCount} tools overdue</p>
            <p className="text-white/60 text-xs mt-0.5">Return immediately</p>
          </button>
        )}
        {activeCheckouts.length > 0 && overdueCount === 0 && (
          <div className="bg-white/40 p-3 rounded-[8px]">
            <p className="text-black font-semibold text-sm">
              <span className="font-bold">{activeCheckouts.length}</span> tools checked out
            </p>
            <p className="text-black/60 text-xs mt-0.5">Return on time</p>
          </div>
        )}
        {todayBookings.length > 0 && (
          <div className="bg-white/40 p-3 rounded-[8px]">
            <p className="text-black font-semibold text-sm">
              <span className="font-bold">{todayBookings.length}</span> bookings today
            </p>
            <p className="text-black/60 text-xs mt-0.5">Don&apos;t be late!</p>
          </div>
        )}
      </div>
      <button
        onClick={() => navigate('/bookings')}
        className="flex items-center justify-between w-full bg-black text-white text-[12px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full hover:bg-black/80 transition-colors mt-auto"
      >
        View Schedule
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <img src={dashboardClusters} alt="Dashboard illustration" className="w-full max-w-xs opacity-60" />
      <p className="text-white/40 text-sm font-medium text-center">No equipment yet.</p>
      <button
        onClick={onSeed}
        disabled={seeding}
        className="bg-[#EC68D8] text-black text-[12px] font-bold uppercase tracking-wide px-6 py-2.5 rounded-full hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {seeding ? 'Seeding…' : 'Seed Equipment'}
      </button>
    </div>
  )
}

// ─── Mobile Header ────────────────────────────────────────────────────────────
function MobileHeader() {
  const navigate = useNavigate()
  return (
    <header className="lg:hidden flex items-center justify-between px-4 bg-black border-b border-white/5 sticky top-0 z-40" style={{ height: 56 }}>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-[8px] overflow-hidden">
          <img src={flowerMark} alt="" className="w-full h-full" />
        </button>
        <span className="font-brand text-[#EC68D8] text-xl leading-none">tinkerer</span>
      </div>
      <button
        onClick={() => navigate('/bookings/new')}
        className="flex items-center gap-1.5 bg-[#EC68D8] text-black text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full"
      >
        <Plus size={12} />
        Book
      </button>
    </header>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = todayStr()
  const [isSeeding, setIsSeeding] = useState(false)

  const { data: equipment = [], isLoading: eqLoading, refetch } = useQuery({
    queryKey: ['equipment', 'all-dashboard'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const snap = await getDocs(ref)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: todayBookings = [] } = useQuery({
    queryKey: ['bookings', 'today', user?.uid],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.BOOKINGS)
      const q = query(ref, where('userId', '==', user!.uid), where('date', '==', today))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  const { data: activeCheckouts = [] } = useQuery({
    queryKey: ['toolCheckouts', 'active', user?.uid],
    queryFn: () => getActiveUserCheckouts(user!.uid),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  const { data: userProjects = [] } = useQuery({
    queryKey: ['projects', 'user', user?.uid],
    queryFn: () => getUserProjects(user!.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const overdueCount   = activeCheckouts.filter(isCheckoutOverdue).length
  const availableCount = equipment.filter(e => e.status === 'available').length
  const offlineCount   = equipment.filter(e => ['under_maintenance','out_of_service','retired'].includes(e.status)).length

  const handleSeed = async () => {
    if (isSeeding) return
    setIsSeeding(true)
    try {
      const { EQUIPMENT_SEED } = await import('@/../scripts/seedEquipment')
      const { addDoc, serverTimestamp } = await import('firebase/firestore')
      const coll = collection(db, COLLECTIONS.EQUIPMENT)
      for (const item of EQUIPMENT_SEED) {
        await addDoc(coll, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      }
      refetch()
    } catch (err: any) {
      console.error('Seed failed:', err)
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="w-full flex flex-col animate-fade-in">

      {/* Mobile header */}
      <MobileHeader />

      {/* Desktop 3-column shell */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar */}
        <Sidebar activeId="dashboard" />

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Desktop top header */}
          <div className="hidden lg:block">
            <Header />
          </div>

          {/* Stat strip */}
          <StatStrip
            sessions={todayBookings.length}
            checkouts={activeCheckouts.length}
            projects={userProjects.length}
            available={availableCount}
            offline={offlineCount}
          />

          {/* Content body */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div
              className="p-6 flex flex-col lg:flex-row gap-6 max-w-[1400px] mx-auto w-full"
              style={{ minHeight: '100%' }}
            >

              {/* Center: form panel + quick actions */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                <FormPanel overdueCount={overdueCount} />

                {equipment.length === 0 && !eqLoading && (
                  <EmptyState onSeed={handleSeed} seeding={isSeeding} />
                )}

                {/* Quick action pills */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Book Machine',  path: '/bookings/new',  bg: '#EC68D8', fg: '#000' },
                    { label: 'Checkout Tool', path: '/checkout',       bg: '#191919', fg: '#fff' },
                    { label: 'Browse Equip.', path: '/equipment',      bg: '#514AF1', fg: '#fff' },
                    { label: 'My Bookings',   path: '/bookings',       bg: '#191919', fg: '#fff' },
                  ].map(a => (
                    <button
                      key={a.label}
                      onClick={() => navigate(a.path)}
                      className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide px-4 py-2.5 rounded-full hover:brightness-110 active:scale-[0.98] transition-all focus:outline-none"
                      style={{ backgroundColor: a.bg, color: a.fg }}
                    >
                      {a.label}
                      <ChevronRight size={12} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: analytics stack */}
              <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-6">
                <AttentionPanel
                  overdueCount={overdueCount}
                  activeCheckouts={activeCheckouts}
                  todayBookings={todayBookings}
                />

                {eqLoading ? (
                  <div className="flex flex-col gap-6">
                    {[128, 160, 136].map(h => (
                      <div
                        key={h}
                        className="bg-[#FFF4BE]/30 animate-pulse"
                        style={{ height: h, borderRadius: 12 }}
                      />
                    ))}
                  </div>
                ) : (
                  <AnalyticsStack
                    equipment={equipment}
                    todayBookings={todayBookings}
                    userProjects={userProjects}
                    activeCheckouts={activeCheckouts}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

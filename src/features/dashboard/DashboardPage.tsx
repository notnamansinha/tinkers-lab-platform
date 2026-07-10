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
import logoMark from '@/assets/tinkerer-figjam/tinkerer-lab-board.webp'
import dashboardClusters from '@/assets/tinkerer-figjam/dashboard-clusters.svg'
import { NetWorthChart, CashflowChart, InvestmentsChart } from '@/components/ui/svgs'

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
        <img src={logoMark} alt="" className="w-full h-full" />
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
              <span className={cn(isActive ? "text-sidebar-active" : "text-sidebar-normal", "leading-none")}>
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
      <span className="font-brand uppercase text-white text-[28px] tracking-wider font-black" style={{ WebkitTextStroke: '1px currentColor' }}>TINKERERS LAB</span>
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
function StatStrip() {
  const stats = [
    { label: 'NET WORTH', value: '€536K', badge: '+2452.4%', badgeBg: '#E1D7A8', bg: '#E1D7A8' },
    { label: 'DEBT', value: '€0', bg: '#E1D7A8' },
    { label: 'SAVINGS', value: '€17K', bg: '#E1D7A8' },
    { label: 'ASSETS', value: '€515K', badge: '+-%', badgeBg: '#E1D7A8', bg: '#E1D7A8' },
    { label: 'INVESTMENTS VALUE', value: '€4K', bg: '#E1D7A8' },
    { label: 'MONTHLY INCOME', value: '€5K', bg: '#E1D7A8' },
    { label: 'MONTHLY EXPENSES', value: '€3K', bg: '#E1D7A8' },
  ]

  return (
    <div className="flex items-stretch flex-shrink-0 px-6 py-6 overflow-x-auto scrollbar-hide gap-2 bg-black">
      {stats.map((stat) => (
        <div key={stat.label} className="flex-1 min-w-[130px] rounded-[16px] p-4 flex flex-col gap-2" style={{ backgroundColor: stat.bg }}>
          <span className="text-[11px] font-bold text-black/50 tracking-wider leading-none">
            {stat.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-brand text-[28px] font-bold text-black leading-none tracking-tight">
              {stat.value}
            </span>
            {stat.badge && (
              <span className="text-[10px] font-bold text-black/60 bg-black/5 px-1.5 py-0.5 rounded-sm">
                {stat.badge}
              </span>
            )}
          </div>
        </div>
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
        <h2 className="text-white text-form-heading leading-none">
          Future Plans
        </h2>
        {overdueCount > 0 && (
          <button
            onClick={() => navigate('/checkout/history')}
            className="flex items-center gap-1.5 bg-[#EC68D8] text-black text-badge px-3 py-1.5 rounded-full hover:brightness-110 transition-all"
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
              className="text-input-label text-white/60 leading-none"
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
                  'w-full h-10 bg-[#746EF8] rounded-[6px] px-3 text-white text-input-text',
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
          className="flex-1 h-10 bg-[#746EF8] text-white text-btn rounded-[8px] hover:bg-[#6A63F0] transition-colors focus:outline-none"
        >
          Book Session
        </button>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex-1 h-10 bg-[#EC68D8] text-black text-btn rounded-[8px] hover:brightness-110 active:scale-[0.98] transition-all focus:outline-none"
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
          <span className="text-axis-label text-[#A9957A]">
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
      <h3 className="text-black text-card-title leading-none">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Financial Analytics ────────────────────────────────────────────────────────
function FinancialAnalytics() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Net Worth Card */}
      <div className="bg-[#FFF4BE] p-6 rounded-[24px] flex-1 min-w-[300px] flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-black/50 tracking-wider">A FAIRLY PRECISE ESTIMATE</span>
            <h3 className="text-chart-title text-black mt-1">NET WORTH PROJECTION</h3>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-[#FFB13F]" />
            <span className="text-[10px] font-bold text-black/80">NET WORTH</span>
          </div>
        </div>
        <div className="flex-1 w-full h-[360px]">
          <NetWorthChart className="w-full h-full" />
        </div>
      </div>

      {/* Cashflow Card */}
      <div className="bg-[#FFF4BE] p-6 rounded-[24px] flex-1 min-w-[280px] flex flex-col gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-black/50 tracking-wider">WHERE YOUR MONTHLY INCOME GOES</span>
          <h3 className="text-chart-title text-black mt-1">CASHFLOW DISTRIBUTION</h3>
        </div>
        <div className="flex-1 w-full flex items-center justify-center">
          <CashflowChart className="w-full max-w-[280px]" />
        </div>
      </div>

      {/* Investments Card */}
      <div className="bg-[#EC68D8] p-6 rounded-[24px] flex-1 min-w-[250px] flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-black/50 tracking-wider">UNTIL 2048</span>
            <h3 className="text-chart-title text-black mt-1">INVESTMENTS</h3>
          </div>
          <div className="flex flex-col gap-1 items-end">
             <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#DDF237]"/><span className="text-[9px] font-bold text-black">FIXED</span></div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 bg-black"/><span className="text-[9px] font-bold text-black">FUNDS</span></div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#514AF1]"/><span className="text-[9px] font-bold text-black">INTERNAL</span></div>
          </div>
        </div>
        <div className="flex-1 w-full h-[360px]">
          <InvestmentsChart className="w-full h-full" />
        </div>
      </div>
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
        <h3 className="text-black text-card-title leading-none">
          Attention Required
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {overdueCount > 0 && (
          <button
            onClick={() => navigate('/checkout/history')}
            className="bg-black text-white p-3 rounded-[8px] text-left hover:bg-black/80 transition-colors w-full"
          >
            <p className="text-[#EC68D8] text-form-heading">{overdueCount} tools overdue</p>
            <p className="text-white/60 text-helper mt-0.5">Return immediately</p>
          </button>
        )}
        {activeCheckouts.length > 0 && overdueCount === 0 && (
          <div className="bg-white/40 p-3 rounded-[8px]">
            <p className="text-black text-form-heading">
              {activeCheckouts.length} tools checked out
            </p>
            <p className="text-black/60 text-helper mt-0.5">Return on time</p>
          </div>
        )}
        {todayBookings.length > 0 && (
          <div className="bg-white/40 p-3 rounded-[8px]">
            <p className="text-black text-form-heading">
              {todayBookings.length} bookings today
            </p>
            <p className="text-black/60 text-helper mt-0.5">Don&apos;t be late!</p>
          </div>
        )}
      </div>
      <button
        onClick={() => navigate('/bookings')}
        className="flex items-center justify-between w-full bg-black text-white text-btn px-4 py-2.5 rounded-full hover:bg-black/80 transition-colors mt-auto"
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
      <p className="text-white/40 text-helper text-center">No equipment yet.</p>
      <button
        onClick={onSeed}
        disabled={seeding}
        className="bg-[#EC68D8] text-black text-btn px-6 py-2.5 rounded-full hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
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
          <img src={logoMark} alt="" className="w-full h-full" />
        </button>
        <span className="font-brand uppercase text-white text-xl tracking-wider font-black" style={{ WebkitTextStroke: '1px currentColor' }}>TINKERERS LAB</span>
      </div>
      <button
        onClick={() => navigate('/bookings/new')}
        className="flex items-center gap-1.5 bg-[#EC68D8] text-black text-btn px-3 py-1.5 rounded-full"
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
          <StatStrip />

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
                      className="flex items-center gap-2 text-btn px-4 py-2.5 rounded-full hover:brightness-110 active:scale-[0.98] transition-all focus:outline-none"
                      style={{ backgroundColor: a.bg, color: a.fg }}
                    >
                      {a.label}
                      <ChevronRight size={12} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Mathical Financial Analytics Section inserted below the form panel */}
              
            </div>
            
            {/* Full Width Financial Analytics */}
            <div className="px-6 pb-6 max-w-[1400px] mx-auto w-full">
               <FinancialAnalytics />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

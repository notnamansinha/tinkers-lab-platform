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
  CalendarDays,
  Wrench,
  ChevronRight,
  AlertTriangle,
  Box,
  MessageSquare
} from 'lucide-react'
import dashboardClusters from '@/assets/tinkerer-figjam/dashboard-clusters.svg'

// ─── Constants ───────────────────────────────────────────────────────────────
const FORM_FIELDS = [
  { id: 'goal',      label: 'MAIN GOAL',           placeholder: 'e.g. Complete PCB prototype' },
  { id: 'budget',    label: 'BUDGET RANGE',        placeholder: 'e.g. ₹5,000 — ₹15,000' },
  { id: 'timeline',  label: 'TIMELINE',            placeholder: 'e.g. 3 months' },
  { id: 'equip',     label: 'PREFERRED EQUIPMENT', placeholder: 'e.g. 3D Printer, Laser Cutter' },
  { id: 'sessions',  label: 'WEEKLY SESSIONS',     placeholder: 'e.g. 2 sessions/week' },
  { id: 'members',   label: 'TEAM SIZE',           placeholder: 'e.g. 4 members' },
] as const

// ─── Stat Strip ──────────────────────────────────────────────────────────────
function LabStats({ stats }: { stats: { label: string, value: string | number, color: string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-[16px] p-5 flex flex-col gap-2 shadow-sm" style={{ backgroundColor: stat.color }}>
          <span className="text-[11px] font-bold text-black/50 tracking-wider leading-none">
            {stat.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-brand text-[32px] font-bold text-black leading-none tracking-tight">
              {stat.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Form Panel ──────────────────────────────────────────────────────────────
function FormPanel() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<Record<string, string>>({})
  const onChange = (id: string, val: string) => setFormData(p => ({ ...p, [id]: val }))

  return (
    <div className="bg-[#514AF1] flex flex-col overflow-hidden shadow-lg" style={{ borderRadius: 16 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-white leading-none text-2xl font-bold font-display">
          Future Project Plans
        </h2>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
        {FORM_FIELDS.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label
              htmlFor={`plan-${field.id}`}
              className="text-white/60 leading-none text-xs font-bold tracking-wider"
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
                  'w-full h-11 bg-[#746EF8] rounded-[8px] px-3 text-white text-sm font-medium',
                  'placeholder:text-white/40 outline-none border-2 border-transparent',
                  'focus:border-[#DDF237] focus:bg-[#6A63F0] hover:bg-[#6E68F5] transition-all'
                )}
              />
              {/* Lime dot: shown on focused/filled field */}
              {formData[field.id] && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#DDF237]" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-6 py-5 border-t border-white/10 bg-black/10">
        <button
          onClick={() => navigate('/bookings/new')}
          className="flex-1 h-11 bg-[#746EF8] text-white font-bold rounded-[8px] hover:bg-[#6A63F0] transition-colors focus:outline-none"
        >
          Book Machine
        </button>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex-1 h-11 bg-[#EC68D8] text-black font-bold rounded-[8px] hover:brightness-110 active:scale-[0.98] transition-all focus:outline-none shadow-md"
        >
          Start Project
        </button>
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
  
  const hasAlerts = overdueCount > 0 || activeCheckouts.length > 0 || todayBookings.length > 0

  return (
    <div className="bg-[#EC68D8] flex flex-col p-6 gap-5 h-full shadow-lg" style={{ borderRadius: 16 }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-[#EC68D8] shrink-0 shadow-sm">
          <AlertTriangle size={18} />
        </div>
        <h3 className="text-black text-2xl font-bold leading-none font-display">
          Attention Required
        </h3>
      </div>
      
      {!hasAlerts ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-black/60 font-medium">All clear! No pending actions.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          {overdueCount > 0 && (
            <button
              onClick={() => navigate('/checkout/history')}
              className="bg-black text-white p-4 rounded-[12px] text-left hover:bg-black/80 transition-colors w-full shadow-md"
            >
              <p className="text-[#EC68D8] text-lg font-bold">{overdueCount} tools overdue</p>
              <p className="text-white/60 text-sm mt-1">Return them immediately to avoid penalties.</p>
            </button>
          )}
          {activeCheckouts.length > 0 && overdueCount === 0 && (
            <div className="bg-white/40 p-4 rounded-[12px] shadow-sm">
              <p className="text-black text-lg font-bold">
                {activeCheckouts.length} tools checked out
              </p>
              <p className="text-black/70 text-sm mt-1">Make sure to return them on time.</p>
            </div>
          )}
          {todayBookings.length > 0 && (
            <div className="bg-white/40 p-4 rounded-[12px] shadow-sm">
              <p className="text-black text-lg font-bold">
                {todayBookings.length} machine bookings today
              </p>
              <p className="text-black/70 text-sm mt-1">Check your schedule so you aren't late.</p>
            </div>
          )}
        </div>
      )}
      
      <button
        onClick={() => navigate('/bookings')}
        className="flex items-center justify-between w-full bg-black text-white font-bold px-5 py-3.5 rounded-full hover:bg-black/80 transition-colors mt-auto shadow-md"
      >
        View My Schedule
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onSeed, seeding }: { onSeed: () => void; seeding: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 bg-white/5 rounded-[16px] border border-white/10 mt-4">
      <img src={dashboardClusters} alt="Dashboard illustration" className="w-full max-w-[200px] opacity-40 mb-2" />
      <p className="text-white/50 font-medium">No equipment found in the lab.</p>
      <button
        onClick={onSeed}
        disabled={seeding}
        className="bg-[#DDF237] text-black font-bold px-6 py-2.5 rounded-full hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md"
      >
        {seeding ? 'Seeding Database…' : 'Seed Equipment Database'}
      </button>
    </div>
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

  const labStats = [
    { label: 'ACTIVE PROJECTS', value: userProjects.length, color: '#E1D7A8' },
    { label: 'AVAILABLE MACHINES', value: `${availableCount} / ${Math.max(equipment.length, 1)}`, color: '#DDF237' },
    { label: "TODAY'S BOOKINGS", value: todayBookings.length, color: '#FFF4BE' },
    { label: 'OVERDUE TOOLS', value: overdueCount, color: overdueCount > 0 ? '#EC68D8' : '#E1D7A8' },
  ]

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-12">
      {/* Top Stats Strip */}
      <LabStats stats={labStats} />

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Forms and Actions */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          <FormPanel />

          {/* Quick Actions */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white/70 text-xs font-bold tracking-wider uppercase ml-1">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Book Machine',  icon: CalendarDays, path: '/bookings/new',  bg: '#EC68D8', fg: '#000' },
                { label: 'Checkout Tool', icon: Wrench,       path: '/checkout',       bg: '#191919', fg: '#fff' },
                { label: 'Lab Inventory', icon: Box,          path: '/inventory',      bg: '#514AF1', fg: '#fff' },
                { label: 'My Projects',   icon: MessageSquare,path: '/projects',       bg: '#191919', fg: '#fff' },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center justify-center gap-3 p-5 rounded-[16px] hover:brightness-110 active:scale-[0.98] transition-all border border-white/5 shadow-md"
                  style={{ backgroundColor: a.bg, color: a.fg }}
                >
                  <a.icon size={28} strokeWidth={2} />
                  <span className="font-bold text-sm text-center tracking-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {equipment.length === 0 && !eqLoading && (
            <EmptyState onSeed={handleSeed} seeding={isSeeding} />
          )}

        </div>

        {/* Right Column: Attention & Alerts */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <AttentionPanel 
            overdueCount={overdueCount} 
            activeCheckouts={activeCheckouts} 
            todayBookings={todayBookings} 
          />
        </div>
        
      </div>
    </div>
  )
}

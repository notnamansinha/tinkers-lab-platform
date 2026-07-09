import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveUserCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { getUserProjects } from '@/services/firebase/projects'
import { EQUIPMENT_SEED } from '@/../scripts/seedEquipment'
import type { Equipment, Booking } from '@/types'
import { cn, todayStr } from '@/lib/utils'
import { AlertTriangle, ArrowRight, Circle, Cog, Cpu, Ruler, Zap } from 'lucide-react'

// ─── Category metadata ──────────────────────────────────────────────────────
const CATEGORY_META = [
  { id: 'Digital Fabrication', label: '3D Printing', icon: Cpu, colorClass: 'bg-lime text-black' },
  { id: 'Electronics', label: 'Electronics', icon: Zap, colorClass: 'bg-pink text-black' },
  { id: 'Heavy Duty', label: 'Metal & CNC', icon: Cog, colorClass: 'bg-indigo text-white' },
  { id: 'Tabletop Power', label: 'Woodshop', icon: Ruler, colorClass: 'bg-orange text-black' },
  { id: 'Other', label: 'Test & Measure', icon: Circle, colorClass: 'bg-cream text-black' },
] as const

type CategoryId = typeof CATEGORY_META[number]['id']

// ─── Status helpers ──────────────────────────────────────────────────────────
function statusLabel(status: Equipment['status']): string {
  switch (status) {
    case 'available':         return 'Available'
    case 'in_use':            return 'In Use'
    case 'reserved':          return 'Reserved'
    case 'under_maintenance': return 'Maintenance'
    case 'out_of_service':    return 'Out of Service'
    case 'retired':           return 'Retired'
    default:                  return status
  }
}

// ─── Category Tile ─────────────────────────────────────
function CategoryTile({
  meta,
  count,
  isActive,
  onClick,
}: {
  meta: typeof CATEGORY_META[number]
  count: number
  isActive: boolean
  onClick: () => void
}) {
  const Icon = meta.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative text-left p-5 md:p-6 rounded-[16px] border border-black/10 transition-all overflow-hidden flex flex-col justify-between min-h-[136px]",
        meta.colorClass,
        isActive ? "shadow-[0_0_0_3px_#fff] -translate-y-1" : "shadow-[0_14px_30px_rgba(0,0,0,0.24)] hover:-translate-y-1"
      )}
    >
      <span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-black/10">
        <Icon size={22} />
      </span>
      <div>
        <p className="font-display font-black text-lg md:text-xl leading-tight uppercase">{meta.label}</p>
        <p className="font-bold opacity-70 text-xs mt-1 uppercase tracking-[0.08em]">{count} {count === 1 ? 'machine' : 'machines'}</p>
      </div>
    </button>
  )
}

// ─── Flat Equipment Card ─────────────────────────────────────────────────────
function EquipmentCard({
  eq,
  onClick,
}: {
  eq: Equipment
  onClick: () => void
}) {
  const isDown     = eq.status === 'under_maintenance' || eq.status === 'out_of_service' || eq.status === 'retired'
  const isOccupied = eq.status === 'in_use' || eq.status === 'reserved'

  const dotColorClass = isDown ? 'bg-white/40' : isOccupied ? 'bg-orange animate-pulse' : 'bg-lime'
  const label    = statusLabel(eq.status)

  return (
    <button
      onClick={onClick}
      className="group text-left w-full bg-[#101010] rounded-[24px] border-4 border-[#191919] hover:border-pink transition-colors overflow-hidden flex flex-col shadow-2xl"
    >
      {/* Photo / Placeholder */}
      <div className="aspect-[16/10] relative bg-black border-b-4 border-[#191919] overflow-hidden flex-shrink-0">
        {eq.imageUrls?.[0] ? (
          <img
            src={eq.imageUrls[0]}
            alt={eq.name}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-white/20 text-xs tracking-widest uppercase">
            NO IMAGE
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-white text-lg leading-tight mb-4 group-hover:text-pink transition-colors">
          {eq.name}
        </h3>
        
        <div className="mt-auto flex items-center gap-3">
          <span className={cn("w-3 h-3 rounded-full border-2 border-black flex-shrink-0", dotColorClass)} />
          <span className="text-white/60 font-bold text-xs uppercase tracking-widest">
            {label}
          </span>
          {eq.requiresTraining && (
            <span className="ml-auto bg-pink text-black px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
              Induction
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const today = todayStr()

  const { data: equipment = [], isLoading, refetch } = useQuery({
    queryKey: ['equipment', 'all'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const snap = await getDocs(ref)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 5 * 60 * 1000,
  })

  // Today's bookings for this user
  const { data: todayBookings = [] } = useQuery({
    queryKey: ['bookings', 'today', user?.uid],
    queryFn: async () => {
      const ref  = collection(db, COLLECTIONS.BOOKINGS)
      const q    = query(ref, where('userId', '==', user!.uid), where('date', '==', today))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  // Active tool checkouts
  const { data: activeCheckouts = [] } = useQuery({
    queryKey: ['toolCheckouts', 'active', user?.uid],
    queryFn: () => getActiveUserCheckouts(user!.uid),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  // User's projects
  const { data: userProjects = [] } = useQuery({
    queryKey: ['projects', 'user', user?.uid],
    queryFn: () => getUserProjects(user!.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const overdueCount = activeCheckouts.filter(isCheckoutOverdue).length

  const availableCount = equipment.filter(e => e.status === 'available').length
  const inUseCount     = equipment.filter(e => e.status === 'in_use' || e.status === 'reserved').length
  const offlineCount   = equipment.filter(e => ['under_maintenance','out_of_service','retired'].includes(e.status)).length

  const categoryCounts = CATEGORY_META.reduce((acc, cat) => {
    acc[cat.id] = equipment.filter(e => e.category === cat.id).length
    return acc
  }, {} as Record<CategoryId, number>)

  const filteredEquipment = activeCategory
    ? equipment.filter(e => e.category === activeCategory)
    : equipment

  const activeMeta = activeCategory
    ? CATEGORY_META.find(c => c.id === activeCategory)
    : null

  // Full seed handler
  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const { addDoc, serverTimestamp } = await import('firebase/firestore')
      const equipCollection = collection(db, COLLECTIONS.EQUIPMENT)
      let seeded = 0
      for (const item of EQUIPMENT_SEED) {
        await addDoc(equipCollection, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        seeded++
      }
      alert(`✅ ${seeded} items seeded to Firestore!`)
      refetch()
    } catch (err: any) {
      alert('Error seeding: ' + err.message)
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* ── Temporary Seed Button ── */}
      {equipment.length === 0 && !isLoading && (
        <div className="bg-indigo/20 border-2 border-indigo text-white p-4 rounded-xl flex items-center justify-between font-bold">
          <p>The equipment database is empty.</p>
          <button 
            onClick={handleSeed}
            disabled={isSeeding}
            className="tl-pill-button py-2 px-4 text-xs"
          >
            {isSeeding ? 'Seeding...' : 'Seed Machines'}
          </button>
        </div>
      )}

      {/* ── Top Section: Hero + Stats + Attention ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Hero + Stats */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Indigo Action Strip */}
          <div className="tl-panel-indigo p-8 flex flex-col justify-center flex-1 rounded-[32px] min-h-[260px]">
            <h1 className="font-display uppercase text-4xl lg:text-5xl font-black text-white leading-[0.95]">
              Book time.<br />Build things.
            </h1>
            <p className="text-white/80 font-bold mt-4 mb-8 max-w-md">
              Reserve equipment, manage sessions, and track your projects — all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/bookings/new')} className="tl-pill-button px-6 text-sm">Book Machine</button>
              <button onClick={() => navigate('/checkout')} className="tl-pill-button-secondary bg-white/10 hover:bg-white/20 border-transparent text-white px-6 text-sm">Checkout Tool</button>
              <button onClick={() => navigate('/projects/new')} className="tl-pill-button-secondary bg-white/10 hover:bg-white/20 border-transparent text-white px-6 text-sm">New Project</button>
            </div>
          </div>

          {/* Cream Stat Strip */}
          <div className="tl-panel-cream p-8 rounded-[32px]">
            <div className="grid grid-cols-3 gap-4 divide-x-4 divide-black/10">
              <button onClick={() => navigate('/bookings')} className="px-4 text-center hover:-translate-y-1 transition-transform">
                <p className="text-4xl lg:text-5xl font-black font-display text-black">{todayBookings.length}</p>
                <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.08em] text-black/50 mt-1">Sessions Today</p>
              </button>
              <button onClick={() => navigate('/checkout/history')} className="px-4 text-center hover:-translate-y-1 transition-transform">
                <p className={cn("text-4xl lg:text-5xl font-black font-display", activeCheckouts.length > 0 ? 'text-pink' : 'text-black')}>{activeCheckouts.length}</p>
                <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.08em] text-black/50 mt-1">Active Checkouts</p>
              </button>
              <button onClick={() => navigate('/projects')} className="px-4 text-center hover:-translate-y-1 transition-transform">
                <p className="text-4xl lg:text-5xl font-black font-display text-black">{userProjects.length}</p>
                <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.08em] text-black/50 mt-1">My Projects</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Attention Panel */}
        <div className="lg:col-span-1">
          <div className="bg-pink rounded-[32px] p-8 h-full border-4 border-black text-black shadow-[4px_4px_0_0_#000] flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-pink shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="font-display uppercase text-2xl font-black leading-none">Attention</h2>
            </div>
            
            <div className="flex-1 flex flex-col gap-3">
              {overdueCount > 0 ? (
                <div className="bg-black text-white p-5 rounded-[20px] border-2 border-black font-bold text-sm">
                  <p className="text-pink font-black text-lg mb-1">{overdueCount} tools overdue.</p>
                  Return immediately.
                </div>
              ) : activeCheckouts.length > 0 ? (
                <div className="bg-white/40 text-black p-5 rounded-[20px] border-2 border-black font-bold text-sm">
                  You have <span className="font-black text-lg">{activeCheckouts.length}</span> tools checked out. Make sure to return them on time.
                </div>
              ) : (
                 <div className="bg-white/40 text-black p-5 rounded-[20px] border-2 border-black font-bold text-sm opacity-60">
                  No active tool checkouts.
                 </div>
              )}
              
              {todayBookings.length > 0 && (
                <div className="bg-white text-black p-5 rounded-[20px] border-2 border-black font-bold text-sm">
                  You have <span className="font-black text-lg">{todayBookings.length}</span> bookings today. Don't be late!
                </div>
              )}
            </div>

            <button onClick={() => navigate('/bookings')} className="w-full tl-pill-button mt-6 bg-black text-white hover:bg-black/80 border-black shadow-none flex justify-center items-center gap-2">
              View Schedule <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Live status ticker ── */}
      <div className="flex flex-wrap gap-6 px-6 py-4 bg-[#101010] text-white rounded-[16px] border border-white/5 font-bold uppercase tracking-[0.08em] text-xs w-fit">
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-lime rounded-full border-2 border-black"/>{availableCount} Available</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange rounded-full border-2 border-black animate-status-pulse"/>{inUseCount} In Use</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-white/30 rounded-full border-2 border-black"/>{offlineCount} Offline</div>
      </div>

      {/* ── Category Tiles ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {CATEGORY_META.map(cat => (
          <CategoryTile
            key={cat.id}
            meta={cat}
            count={categoryCounts[cat.id] ?? 0}
            isActive={activeCategory === cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
          />
        ))}
      </div>

      {/* ── Equipment Grid ── */}
      <div className="space-y-6 pt-4">
        <div className="flex justify-between items-end border-b-4 border-[#191919] pb-4">
          <h2 className="font-display text-3xl md:text-4xl uppercase font-black text-white">
            {activeMeta ? activeMeta.label : 'All Machines'}
            <span className="ml-4 text-white/30 font-bold text-xl">{filteredEquipment.length}</span>
          </h2>
          {activeCategory && (
            <button onClick={() => setActiveCategory(null)} className="text-pink font-bold hover:underline uppercase tracking-widest text-xs mb-1">
              Show All
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[280px] rounded-[24px] bg-[#101010] border-4 border-[#191919] animate-pulse" />
            ))}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="py-20 text-center text-white/40 font-bold uppercase tracking-widest">
            No machines found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEquipment.map(eq => (
              <EquipmentCard
                key={eq.id}
                eq={eq}
                onClick={() => navigate(`/equipment/${eq.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

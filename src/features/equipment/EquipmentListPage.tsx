import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus } from 'lucide-react'
import type { Equipment, EquipmentCategory } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  available:         { label: 'Available',    color: '#34C759' },
  reserved:          { label: 'Reserved',     color: '#FF9500' },
  in_use:            { label: 'In Use',       color: '#FF9500' },
  under_maintenance: { label: 'Maintenance',  color: '#8E8E93' },
  out_of_service:    { label: 'Out of Service', color: '#FF3B30' },
  retired:           { label: 'Retired',      color: '#8E8E93' },
} as const

const CATEGORY_LABELS: Record<string, string> = {
  'Digital Fabrication': '3D Printing',
  'Electronics':         'Electronics',
  'Heavy Duty':          'Metal / CNC',
  'Tabletop Power':      'Woodshop',
  'Other':               'Test & Measurement',
  'all':                 'All Categories',
}

const CATEGORIES: EquipmentCategory[] = [
  'Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics', 'Other',
]

const STATUS_FILTERS = ['available', 'in_use', 'under_maintenance', 'out_of_service'] as const

export default function EquipmentListPage() {
  const { isStaff } = useAuth()
  const navigate    = useNavigate()
  const [search,       setSearch]       = useState('')
  const [filterCat,    setFilterCat]    = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewMode, setViewMode]         = useState<'grid' | 'list'>('grid')

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const ref  = collection(db, COLLECTIONS.EQUIPMENT)
      const q    = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = equipment.filter(e => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.machineId.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filterCat    === 'all' || e.category === filterCat
    const matchStatus = filterStatus === 'all' || e.status   === filterStatus
    return matchSearch && matchCat && matchStatus
  })

  // ── Pill chip helper ──
  function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "px-4 py-2 rounded-full font-bold uppercase tracking-widest text-xs transition-colors border-2",
          active ? "bg-indigo text-white border-indigo" : "bg-transparent text-black/50 border-black/20 hover:border-black/50 hover:text-black"
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-in fade-in duration-300">
      
      {/* ── Page header & Filters ── */}
      <div className="tl-panel-cream p-6 lg:p-8 rounded-[32px] mb-8">
        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 mb-8 border-b-4 border-black/10 pb-6">
          <div>
            <h1 className="font-['Arial_Black'] uppercase text-4xl lg:text-5xl font-black text-black tracking-tight leading-[0.95] mb-2">
              Machines & Equipment
            </h1>
            <p className="text-black/60 font-bold max-w-md">
              Browse the catalog. Tier-1 equipment requires induction and booking.
            </p>
          </div>
          {isStaff && (
            <button
              onClick={() => navigate('/equipment/new')}
              className="tl-pill-button flex items-center gap-2 px-6"
            >
              <Plus size={18} /> Add Equipment
            </button>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
          {/* Search input */}
          <div className="relative w-full lg:w-72 flex-shrink-0">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="tl-input pl-11 w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2 flex-1">
            <Chip label="All Categories" active={filterCat === 'all'} onClick={() => setFilterCat('all')} />
            {CATEGORIES.map(c => (
              <Chip key={c} label={CATEGORY_LABELS[c] ?? c} active={filterCat === c} onClick={() => setFilterCat(c)} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t-2 border-black/10">
           <Chip label="Any Status" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
            {STATUS_FILTERS.map(s => (
              <Chip key={s} label={STATUS_CONFIG[s].label} active={filterStatus === s} onClick={() => setFilterStatus(s)} />
            ))}
        </div>
      </div>

      {/* ── Equipment Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[280px] rounded-[24px] bg-[#101010] border-4 border-[#191919] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-white/40 font-bold uppercase tracking-widest">
          No equipment found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(e => {
            const cfg  = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.available
            const pulse = e.status === 'in_use' || e.status === 'reserved'
            const isDown = e.status === 'under_maintenance' || e.status === 'out_of_service' || e.status === 'retired'
            const dotColorClass = isDown ? 'bg-white/40' : pulse ? 'bg-orange animate-pulse' : 'bg-lime'

            return (
              <button
                key={e.id}
                onClick={() => navigate(`/equipment/${e.id}`)}
                className="group text-left w-full bg-[#101010] rounded-[24px] border-4 border-[#191919] hover:border-pink transition-colors overflow-hidden flex flex-col shadow-[4px_4px_0_0_#000]"
              >
                {/* Photo */}
                <div className="aspect-[16/10] relative bg-black border-b-4 border-[#191919] overflow-hidden flex-shrink-0">
                  {e.imageUrls?.[0] ? (
                    <img src={e.imageUrls[0]} alt={e.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-white/20 text-xs tracking-widest uppercase">
                      NO IMAGE
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex flex-col">
                  <span className="font-bold text-white/40 text-[10px] uppercase tracking-widest mb-2">
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </span>
                  <h3 className="font-bold text-white text-lg leading-tight mb-4 group-hover:text-pink transition-colors">
                    {e.name}
                  </h3>
                  
                  <div className="mt-auto flex items-center gap-3">
                    <span className={cn("w-3 h-3 rounded-full border-2 border-black flex-shrink-0", dotColorClass)} />
                    <span className="text-white/60 font-bold text-xs uppercase tracking-widest">
                      {cfg.label}
                    </span>
                    {e.status === 'available' && (
                      <span
                        onClick={ev => { ev.stopPropagation(); navigate(`/bookings/new?machine=${e.id}`) }}
                        className="ml-auto bg-indigo text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-pink transition-colors border-2 border-black"
                      >
                        Book
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Wrench } from 'lucide-react'
import type { Equipment, EquipmentCategory } from '@/types'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { EntityCard } from '@/components/common/EntityCard'

const STATUS_CONFIG = {
  available:         { label: 'Available',      chip: 'bg-lime text-black font-bold',      dot: 'bg-lime',            pulse: false },
  reserved:          { label: 'Reserved',       chip: 'bg-orange text-black font-bold',    dot: 'bg-orange animate-pulse', pulse: true },
  in_use:            { label: 'In Use',         chip: 'bg-orange text-black font-bold',    dot: 'bg-orange animate-pulse', pulse: true },
  under_maintenance: { label: 'Maintenance',    chip: 'bg-pink/20 text-pink border border-pink/30 font-bold', dot: 'bg-pink', pulse: false },
  out_of_service:    { label: 'Out of Service', chip: 'bg-pink text-black font-bold',      dot: 'bg-pink',            pulse: false },
  retired:           { label: 'Retired',        chip: 'bg-white/10 text-white/50 border border-hairline', dot: 'bg-white/40', pulse: false },
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

  return (
    <div className="mx-auto mt-2 w-full max-w-[1440px] min-w-0 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Machines & Equipment"
        description="Browse lab equipment catalog. Tier-1 machines require safety induction and booking."
        action={
          isStaff ? (
            <button
              onClick={() => navigate('/equipment/new')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-5 py-2.5 text-xs font-bold text-black shadow-sm transition-all hover:bg-lime/90"
            >
              <Plus size={16} /> Add Equipment
            </button>
          ) : undefined
        }
        filters={
          <div className="flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative w-full lg:w-80 shrink-0">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  aria-label="Search equipment by name or ID"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-near-black border border-hairline text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                />
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                <FilterChip label="All Categories" active={filterCat === 'all'} onClick={() => setFilterCat('all')} />
                {CATEGORIES.map(c => (
                  <FilterChip
                    key={c}
                    label={CATEGORY_LABELS[c] ?? c}
                    active={filterCat === c}
                    onClick={() => setFilterCat(c)}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-hairline">
              <FilterChip label="Any Status" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
              {STATUS_FILTERS.map(s => (
                <FilterChip
                  key={s}
                  label={STATUS_CONFIG[s].label}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(s)}
                />
              ))}
            </div>
          </div>
        }
      />

      {isLoading ? (
           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-card bg-near-black border border-hairline animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
           <div className="py-10 text-center text-xs text-white/40">
          No equipment found matching your filters.
        </div>
      ) : (
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map(e => {
            const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.available

            return (
              <EntityCard key={e.id}>
                <div className="aspect-[16/10] relative bg-black/60 overflow-hidden shrink-0 border-b border-hairline">
                  {e.imageUrls?.[0] ? (
                    <img src={e.imageUrls[0]} alt={e.name} className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-2">
                      <Wrench className="h-8 w-8 text-white/20" />
                      <span className="text-[10px] uppercase tracking-widest font-bold">No Image</span>
                    </div>
                  )}
                  {/* Status Overlay Badge */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                    <span className="text-white/90 font-bold text-[10px] uppercase tracking-wider leading-none">
                      {cfg.label}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">
                      {CATEGORY_LABELS[e.category] ?? e.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/equipment/${e.id}`)}
                      className="text-left w-full group/link"
                    >
                      <h3 className="text-base font-bold text-white mb-2 leading-snug group-hover/link:text-lime transition-colors">
                        {e.name}
                      </h3>
                    </button>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-hairline/50">
                    <span className="text-[11px] text-white/50 font-medium truncate">
                      {e.location || 'Lab Storage'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/equipment/${e.id}`)}
                        className="text-white/40 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-colors"
                      >
                        View
                      </button>
                      {e.status === 'available' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/bookings/new?machine=${e.id}`)}
                          className="bg-lime text-black px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-lime/90 transition-all shadow-sm"
                        >
                          Book
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </EntityCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { EntityCard } from '@/components/common/EntityCard'

const STATUS_CONFIG = {
  available:         { label: 'Available',      chip: 'bg-[#DDF237] text-white' },
  reserved:          { label: 'Reserved',       chip: 'bg-[#FFB13F] text-white' },
  in_use:            { label: 'In Use',         chip: 'bg-[#FFB13F] text-white' },
  under_maintenance: { label: 'Maintenance',    chip: 'bg-white/10 text-white/50' },
  out_of_service:    { label: 'Out of Service', chip: 'bg-[#EC68D8] text-white' },
  retired:           { label: 'Retired',        chip: 'bg-[rgba(255,255,255,0.05)] text-white/40' },
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
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in mt-4">
      <PageHeader
        variant="dark"
        title="Machines"
        description="Browse the catalog. Tier-1 equipment requires induction and booking."
        action={
          isStaff ? (
            <button onClick={() => navigate('/equipment/new')} className="tl-pill-button-secondary flex items-center gap-2 px-6">
              <Plus size={18} /> Add Equipment
            </button>
          ) : undefined
        }
        filters={
          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
              <div className="relative w-full lg:w-80 flex-shrink-0">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="tl-input pl-12 w-full h-[44px]"
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
            <div className="flex flex-wrap gap-2 pt-5 border-t border-[rgba(255,255,255,0.06)]">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[300px] rounded-[24px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-white/30 text-[14px]">
          No equipment found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(e => {
            const cfg  = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.available
            const pulse = e.status === 'in_use' || e.status === 'reserved'
            const isDown = e.status === 'under_maintenance' || e.status === 'out_of_service' || e.status === 'retired'
            const dotColorClass = isDown ? 'bg-white/30' : pulse ? 'bg-[#FFB13F] animate-pulse shadow-[0_0_8px_rgba(255,177,63,0.8)]' : 'bg-[#DDF237] shadow-[0_0_8px_rgba(221,242,55,0.8)]'

            return (
              <EntityCard key={e.id} as="button" onClick={() => navigate(`/equipment/${e.id}`)}>
                <div className="aspect-[16/10] relative bg-[rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0">
                  {e.imageUrls?.[0] ? (
                    <img src={e.imageUrls[0]} alt={e.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-[12px] uppercase tracking-widest font-semibold">
                      No Image
                    </div>
                  )}
                  {/* Status Overlay */}
                  <div className="absolute top-3 left-3 bg-[rgba(0,0,0,0.4)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] px-2.5 py-1 rounded-full flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', dotColorClass)} />
                    <span className="text-white/80 font-medium text-[10px] uppercase tracking-widest leading-none">
                      {cfg.label}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <span className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.1em] mb-1.5 block">
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </span>
                  <h3 className="text-[18px] font-semibold text-white mb-2 leading-tight group-hover:text-[#514AF1] transition-colors">
                    {e.name}
                  </h3>
                  
                  <div className="mt-auto flex items-center justify-end gap-3 pt-4">
                    {e.status === 'available' && (
                      <span
                        onClick={ev => { ev.stopPropagation(); navigate(`/bookings/new?machine=${e.id}`) }}
                        className="bg-[rgba(255,255,255,0.08)] text-white/80 hover:text-white px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[#514AF1] transition-all border border-[rgba(255,255,255,0.1)]"
                      >
                        Book
                      </span>
                    )}
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

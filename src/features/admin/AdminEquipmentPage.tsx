import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { deleteAllEquipmentImages } from '@/services/firebase/equipmentImages'
import { toast } from 'sonner'
import type { Equipment, EquipmentCategory } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Search, Pencil, Trash2, Wrench, CheckCircle2, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DataPanel } from '@/components/common/DataPanel'

// ── Constants ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  available:         { label: 'Available',      chip: 'bg-lime/15 text-lime border border-lime/30',              dot: 'bg-lime' },
  reserved:          { label: 'Reserved',       chip: 'bg-orange/15 text-orange border border-orange/30',        dot: 'bg-orange animate-pulse' },
  in_use:            { label: 'In Use',         chip: 'bg-orange/15 text-orange border border-orange/30',        dot: 'bg-orange animate-pulse' },
  under_maintenance: { label: 'Maintenance',    chip: 'bg-pink/15 text-pink border border-pink/30',              dot: 'bg-pink' },
  out_of_service:    { label: 'Out of Service', chip: 'bg-white/10 text-white/50 border border-white/10',        dot: 'bg-white/40' },
  retired:           { label: 'Retired',        chip: 'bg-white/5 text-white/30 border border-white/5',          dot: 'bg-white/20' },
} as const

const TIER_LABELS: Record<string, string> = {
  bookable:         'Tier 1 · Bookable',
  checkout:         'Tier 2 · Checkout',
  freely_available: 'Tier 3 · Free',
}

const CATEGORIES: EquipmentCategory[] = [
  'Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics', 'Other',
]

export default function AdminEquipmentPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  const [search,       setSearch]       = useState('')
  const [filterCat,    setFilterCat]    = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null)

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: equipment = [], isLoading } = useQuery<Equipment[]>({
    queryKey: ['equipment', 'admin'],
    queryFn: async () => {
      const ref  = collection(db, COLLECTIONS.EQUIPMENT)
      const q    = query(ref, orderBy('name', 'asc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ ...d.data(), id: d.id }) as Equipment)
    },
    staleTime: 2 * 60 * 1000,
  })

  const filtered = equipment.filter(e => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.machineId.toLowerCase().includes(search.toLowerCase()) ||
      (e.manufacturer ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat    = filterCat    === 'all' || e.category === filterCat
    const matchStatus = filterStatus === 'all' || e.status   === filterStatus
    return matchSearch && matchCat && matchStatus
  })

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (eq: Equipment) => {
      // 1. Remove images from Storage first
      if (eq.imageUrls?.length) {
        await deleteAllEquipmentImages(eq.imageUrls)
      }
      // 2. Remove Firestore document
      await deleteDoc(doc(db, COLLECTIONS.EQUIPMENT, eq.id))
    },
    onSuccess: (_, eq) => {
      toast.success(`"${eq.name}" deleted.`)
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      setDeleteTarget(null)
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    },
  })

  return (
    <div className="mx-auto w-full max-w-[1440px] min-w-0 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Equipment Manager"
        description={`${equipment.length} items total · manage machines, tools, and images`}
        action={
          <button
            onClick={() => navigate('/equipment/new')}
            className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-xs font-bold text-black shadow-sm transition-all hover:bg-lime/90 active:scale-[0.98]"
            id="add-equipment-btn"
          >
            <Plus size={15} /> Add Equipment
          </button>
        }
        filters={
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search name, ID, or manufacturer…"
                aria-label="Search equipment"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-near-black border border-hairline text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All Categories" active={filterCat === 'all'} onClick={() => setFilterCat('all')} />
              {CATEGORIES.map(c => (
                <FilterChip key={c} label={c} active={filterCat === c} onClick={() => setFilterCat(c)} />
              ))}
            </div>

            {/* Status filter */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-hairline">
              <FilterChip label="Any Status" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
              {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(s => (
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

      <DataPanel title={`${filtered.length} Equipment Item${filtered.length !== 1 ? 's' : ''}`}>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Wrench className="mx-auto mb-3 h-10 w-10 text-white/15" />
            <p className="text-sm text-white/40">No equipment found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(eq => {
              const sc = STATUS_CONFIG[eq.status] ?? STATUS_CONFIG.out_of_service
              return (
                <div
                  key={eq.id}
                  className="group flex gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.04]"
                >
                  {/* Thumbnail */}
                  <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black">
                    {eq.imageUrls?.[0] ? (
                      <img
                        src={eq.imageUrls[0]}
                        alt={eq.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Wrench className="h-7 w-7 text-white/15" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white leading-tight">{eq.name}</p>
                        <p className="text-[10px] text-white/35 font-mono mt-0.5">{eq.machineId}</p>
                      </div>
                      {/* Confirmed badge */}
                      <span title={eq.confirmed ? 'Physically confirmed in lab' : 'Not yet confirmed in lab'}>
                        {eq.confirmed
                          ? <CheckCircle2 size={14} className="text-lime shrink-0 mt-0.5" />
                          : <XCircle     size={14} className="text-white/25 shrink-0 mt-0.5" />
                        }
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Status */}
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', sc.chip)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
                        {sc.label}
                      </span>
                      {/* Tier */}
                      <span className="text-[10px] text-white/35 font-medium">
                        {TIER_LABELS[eq.tier] ?? eq.tier}
                      </span>
                    </div>

                    {/* Description snippet */}
                    <p className="text-[11px] text-white/40 line-clamp-1 leading-snug">
                      {eq.description}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/equipment/${eq.id}/edit`)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70 transition-all hover:border-white/30 hover:text-white"
                        id={`edit-equipment-${eq.id}`}
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(eq)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400/70 transition-all hover:border-red-500/40 hover:text-red-400"
                        id={`delete-equipment-${eq.id}`}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DataPanel>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Delete Equipment"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}" and all its images. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete permanently"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </div>
  )
}

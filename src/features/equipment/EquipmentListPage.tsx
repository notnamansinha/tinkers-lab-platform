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

  // ── Pill chip helper ──────────────────────────────────────────────────────
  function Chip({
    label, active, onClick,
  }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: '5px 14px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 500,
          border: active ? 'none' : '1px solid rgba(255,255,255,0.14)',
          background: active ? '#0A84FF' : 'transparent',
          color: active ? '#fff' : '#98989D',
          cursor: 'pointer',
          transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
          fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
    )
  }

  // ── Status dot ───────────────────────────────────────────────────────────
  function StatusDot({ status }: { status: Equipment['status'] }) {
    const cfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.available
    const pulse = status === 'in_use' || status === 'reserved'
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          className={cn('inline-block rounded-full', pulse && 'animate-status-pulse')}
          style={{ width: 7, height: 7, background: cfg.color, flexShrink: 0 }}
        />
        <span style={{ fontSize: 12, color: '#98989D' }}>{cfg.label}</span>
      </span>
    )
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 48 }}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1
            style={{
              fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
              fontWeight: 600, fontSize: 30, letterSpacing: '-0.01em', lineHeight: 1.1,
              color: '#F5F5F7', marginBottom: 6,
            }}
          >
            Machines & Equipment
          </h1>
          <p style={{ color: '#98989D', fontSize: 14 }}>
            Browse the catalog. Tier-1 equipment requires induction and booking.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => navigate('/equipment/new')}
            className="animate-press"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              borderRadius: 12, background: '#0A84FF',
              color: '#fff', border: 'none', cursor: 'pointer',
              padding: '8px 16px', fontSize: 14, fontWeight: 600,
              fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={15} /> Add Equipment
          </button>
        )}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 28, alignItems: 'center' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 240 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#98989D', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 34, paddingRight: 14,
              height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#F5F5F7', fontSize: 13,
              fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
              outline: 'none',
            }}
          />
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip label="All" active={filterCat === 'all'} onClick={() => setFilterCat('all')} />
          {CATEGORIES.map(c => (
            <Chip key={c} label={CATEGORY_LABELS[c] ?? c} active={filterCat === c} onClick={() => setFilterCat(c)} />
          ))}
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip label="Any Status" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
          {STATUS_FILTERS.map(s => (
            <Chip
              key={s}
              label={STATUS_CONFIG[s].label}
              active={filterStatus === s}
              onClick={() => setFilterStatus(s)}
            />
          ))}
        </div>

        {/* View toggle */}
        <div
          style={{
            display: 'flex', gap: 2,
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10, padding: 3,
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          {(['grid', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: viewMode === v ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: viewMode === v ? '#F5F5F7' : '#98989D',
                transition: 'background 200ms ease, color 200ms ease',
                fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
              }}
            >
              {v === 'grid' ? '⊞ Grid' : '≡ List'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────── */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 240, borderRadius: 24,
                background: '#141518',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: 0.5,
              }}
            />
          ))}
        </div>

      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: '80px 0', textAlign: 'center',
            color: '#98989D', fontSize: 15,
          }}
        >
          No equipment found matching your filters.
        </div>

      ) : viewMode === 'grid' ? (
        // ── Grid view ──────────────────────────────────────────────
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map(e => {
            const cfg  = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.available
            const pulse = e.status === 'in_use' || e.status === 'reserved'

            return (
              <button
                key={e.id}
                onClick={() => navigate(`/equipment/${e.id}`)}
                className="group text-left w-full"
                style={{
                  background: '#141518',
                  borderRadius: 24,
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
                  overflow: 'hidden',
                  transition: 'transform 300ms cubic-bezier(0.32,0.72,0,1), border-color 300ms ease, box-shadow 300ms ease',
                  display: 'flex', flexDirection: 'column',
                  cursor: 'pointer',
                }}
                onMouseEnter={el => {
                  ;(el.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                  ;(el.currentTarget as HTMLElement).style.borderColor = 'rgba(10,132,255,0.28)'
                  ;(el.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.45)'
                }}
                onMouseLeave={el => {
                  ;(el.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ;(el.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                  ;(el.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.30)'
                }}
              >
                {/* Photo placeholder */}
                <div
                  style={{
                    aspectRatio: '16/9', overflow: 'hidden', flexShrink: 0,
                    background: '#0D0E10',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {e.imageUrls?.[0] ? (
                    <img src={e.imageUrls[0]} alt={e.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.08em' }}>
                      NO IMAGE
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '13px 16px 15px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SF Mono, monospace',
                      fontSize: 10, color: '#98989D', letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}
                  >
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </span>
                  <p
                    style={{
                      fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
                      fontWeight: 600, fontSize: 14, lineHeight: 1.3, color: '#F5F5F7',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {e.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                    <span
                      className={cn('inline-block rounded-full', pulse && 'animate-status-pulse')}
                      style={{ width: 7, height: 7, background: cfg.color, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: '#98989D' }}>{cfg.label}</span>
                    {e.status === 'available' && (
                      <span
                        onClick={ev => { ev.stopPropagation(); navigate(`/bookings/new?machine=${e.id}`) }}
                        style={{
                          marginLeft: 'auto', fontSize: 12, color: '#0A84FF',
                          fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
                          cursor: 'pointer', padding: '2px 8px',
                          borderRadius: 999, border: '1px solid rgba(10,132,255,0.35)',
                          transition: 'background 200ms ease',
                        }}
                      >
                        Book →
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

      ) : (
        // ── List view ────────────────────────────────────────────
        <div
          style={{
            background: '#141518',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 160px 140px 120px auto',
              gap: 12, padding: '10px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'ui-monospace, SF Mono, monospace',
              fontSize: 10, color: '#98989D', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            <span>ID</span>
            <span>Name</span>
            <span>Category</span>
            <span>Location</span>
            <span>Status</span>
            <span></span>
          </div>

          {filtered.map((e, idx) => {
            const cfg  = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.available
            const pulse = e.status === 'in_use' || e.status === 'reserved'

            return (
              <div
                key={e.id}
                onClick={() => navigate(`/equipment/${e.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 160px 140px 120px auto',
                  gap: 12, padding: '12px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                  alignItems: 'center',
                }}
                onMouseEnter={el => {
                  ;(el.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                }}
                onMouseLeave={el => {
                  ;(el.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <span style={{ fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11, color: '#98989D' }}>
                  {e.machineId}
                </span>
                <span style={{ fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif', fontSize: 14, fontWeight: 500, color: '#F5F5F7' }}>
                  {e.name}
                </span>
                <span style={{ fontFamily: 'ui-monospace, SF Mono, monospace', fontSize: 11, color: '#98989D' }}>
                  {CATEGORY_LABELS[e.category] ?? e.category}
                </span>
                <span style={{ fontSize: 13, color: '#98989D' }}>
                  {e.location || '—'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className={cn('inline-block rounded-full', pulse && 'animate-status-pulse')}
                    style={{ width: 7, height: 7, background: cfg.color, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: '#98989D' }}>{cfg.label}</span>
                </span>
                {e.status === 'available' && (
                  <button
                    onClick={ev => { ev.stopPropagation(); navigate(`/bookings/new?machine=${e.id}`) }}
                    style={{
                      fontSize: 12, color: '#0A84FF',
                      background: 'transparent', border: '1px solid rgba(10,132,255,0.35)',
                      borderRadius: 999, padding: '3px 10px', cursor: 'pointer',
                      fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
                    }}
                  >
                    Book
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

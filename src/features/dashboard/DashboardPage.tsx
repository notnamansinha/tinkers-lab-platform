import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import type { Equipment } from '@/types'
import { cn } from '@/lib/utils'

// ─── Category metadata ──────────────────────────────────────────────────────
const CATEGORY_META = [
  {
    id: 'Digital Fabrication' as const,
    label: '3D Printing & Additive',
    icon: '⬡',
    gradient: `
      radial-gradient(circle at center,  rgba(5,8,2,0.92) 0%, rgba(12,18,6,0.80) 28%, rgba(35,55,20,0.22) 58%, transparent 100%),
      radial-gradient(circle at top left, rgba(212,245,190,0.48) 0%, rgba(212,245,190,0.20) 36%, transparent 66%),
      radial-gradient(circle at bottom right, rgba(166,227,128,0.38) 0%, rgba(166,227,128,0.14) 32%, transparent 62%),
      linear-gradient(135deg, #1f2c14 0%, #84B860 100%)
    `,
    accent: '#A3D97A',
  },
  {
    id: 'Electronics' as const,
    label: 'Electronics & PCB Lab',
    icon: '⚡',
    gradient: `
      radial-gradient(circle at center,  rgba(5,5,18,0.92) 0%, rgba(12,12,30,0.80) 30%, rgba(40,40,70,0.20) 60%, transparent 100%),
      radial-gradient(circle at top left, rgba(200,204,227,0.42) 0%, rgba(200,204,227,0.18) 36%, transparent 66%),
      radial-gradient(circle at bottom right, rgba(144,149,192,0.34) 0%, rgba(144,149,192,0.14) 32%, transparent 62%),
      linear-gradient(135deg, #1d2038 0%, #6D729C 100%)
    `,
    accent: '#9598C0',
  },
  {
    id: 'Heavy Duty' as const,
    label: 'Metal Shop & CNC',
    icon: '⚙',
    gradient: `
      radial-gradient(circle at center,  rgba(0,5,8,0.94) 0%, rgba(0,12,14,0.82) 30%, rgba(10,40,42,0.20) 60%, transparent 100%),
      radial-gradient(circle at top left, rgba(83,126,114,0.40) 0%, rgba(83,126,114,0.18) 36%, transparent 66%),
      radial-gradient(circle at bottom right, rgba(43,106,109,0.36) 0%, rgba(43,106,109,0.14) 32%, transparent 62%),
      linear-gradient(135deg, #0d2028 0%, #17506A 100%)
    `,
    accent: '#4A8E80',
  },
  {
    id: 'Tabletop Power' as const,
    label: 'Woodshop & Power Tools',
    icon: '🪚',
    gradient: `
      radial-gradient(circle at center,  rgba(10,6,3,0.92) 0%, rgba(20,13,6,0.80) 28%, rgba(80,45,15,0.22) 58%, transparent 100%),
      radial-gradient(circle at top left, rgba(245,200,140,0.46) 0%, rgba(245,200,140,0.20) 36%, transparent 66%),
      radial-gradient(circle at bottom right, rgba(196,120,60,0.36) 0%, rgba(196,120,60,0.14) 32%, transparent 62%),
      linear-gradient(135deg, #2c1c10 0%, #B87333 100%)
    `,
    accent: '#C08050',
  },
  {
    id: 'Other' as const,
    label: 'Test & Measurement',
    icon: '◎',
    gradient: `
      radial-gradient(circle at center,  rgba(3,5,8,0.92) 0%, rgba(8,12,16,0.80) 28%, rgba(30,45,58,0.22) 58%, transparent 100%),
      radial-gradient(circle at top left, rgba(190,205,224,0.44) 0%, rgba(190,205,224,0.18) 36%, transparent 66%),
      radial-gradient(circle at bottom right, rgba(120,140,168,0.36) 0%, rgba(120,140,168,0.14) 32%, transparent 62%),
      linear-gradient(135deg, #10161d 0%, #5C7A99 100%)
    `,
    accent: '#7A9AB8',
  },
] as const

type CategoryId = typeof CATEGORY_META[number]['id']

// ─── Status helpers ──────────────────────────────────────────────────────────
function StatusDot({ status }: { status: Equipment['status'] }) {
  const isDown     = status === 'under_maintenance' || status === 'out_of_service' || status === 'retired'
  const isOccupied = status === 'in_use' || status === 'reserved'

  let color = '#34C759'
  let pulse = false

  if (isDown)     { color = '#8E8E93' }
  else if (isOccupied) { color = '#FF9500'; pulse = true }

  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full shrink-0', pulse && 'animate-status-pulse')}
      style={{ background: color }}
    />
  )
}

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

// ─── Atmospheric Gradient Category Tile ─────────────────────────────────────
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
  return (
    <button
      onClick={onClick}
      className="relative text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]"
      style={{
        borderRadius: 32,
        border: isActive ? '1.5px solid rgba(10,132,255,0.55)' : '1px solid rgba(255,255,255,0.10)',
        background: meta.gradient,
        boxShadow: isActive
          ? '0 20px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(10,132,255,0.25)'
          : '0 20px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(30px) saturate(135%)',
        WebkitBackdropFilter: 'blur(30px) saturate(135%)',
        overflow: 'hidden',
        transition: 'transform 400ms cubic-bezier(0.32,0.72,0,1), box-shadow 300ms ease, border-color 200ms ease',
        transform: isActive ? 'scale(0.98)' : 'scale(1)',
        padding: '20px 20px 18px',
        minHeight: 130,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      {/* Grain overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E\")",
          opacity: 1, zIndex: 1,
        }}
      />

      {/* Content — sits above grain (z-index: 2) */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{meta.icon}</span>
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <p
          style={{
            fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: '0',
            lineHeight: 1.2,
            color: '#F5F5F7',
            marginBottom: 4,
          }}
        >
          {meta.label}
        </p>
        <p
          style={{
            fontFamily: 'ui-monospace, SF Mono, JetBrains Mono, monospace',
            fontSize: 12,
            color: meta.accent,
            opacity: 0.85,
          }}
        >
          {count} {count === 1 ? 'machine' : 'machines'}
        </p>
      </div>
    </button>
  )
}

// ─── Flat Equipment Card ─────────────────────────────────────────────────────
function EquipmentCard({
  eq,
  categoryAccent,
  onClick,
}: {
  eq: Equipment
  categoryAccent: string
  onClick: () => void
}) {
  const isDown     = eq.status === 'under_maintenance' || eq.status === 'out_of_service' || eq.status === 'retired'
  const isOccupied = eq.status === 'in_use' || eq.status === 'reserved'

  const dotColor = isDown ? '#8E8E93' : isOccupied ? '#FF9500' : '#34C759'
  const label    = statusLabel(eq.status)

  return (
    <button
      onClick={onClick}
      className="group text-left w-full"
      style={{
        background: '#141518',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
        overflow: 'hidden',
        transition: 'transform 300ms cubic-bezier(0.32,0.72,0,1), border-color 300ms ease, box-shadow 300ms ease',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(10,132,255,0.28)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.45)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.30)'
      }}
    >
      {/* Photo / Placeholder */}
      <div
        style={{
          aspectRatio: '16/9',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
          background: `radial-gradient(circle at 30% 30%, ${categoryAccent}22 0%, transparent 70%), #0D0E10`,
        }}
      >
        {eq.imageUrls?.[0] ? (
          <img
            src={eq.imageUrls[0]}
            alt={eq.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'ui-monospace, SF Mono, monospace',
              fontSize: 11, color: 'rgba(255,255,255,0.18)',
              letterSpacing: '0.08em',
            }}
          >
            NO IMAGE
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p
            style={{
              fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
              fontWeight: 600, fontSize: 15, lineHeight: 1.25,
              color: '#F5F5F7',
              flex: 1,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}
          >
            {eq.name}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 4 }}>
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full shrink-0',
              (eq.status === 'in_use' || eq.status === 'reserved') && 'animate-status-pulse'
            )}
            style={{ background: dotColor }}
          />
          <span
            style={{
              fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
              fontSize: 12, color: '#98989D',
            }}
          >
            {label}
          </span>
          {eq.requiresTraining && (
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: 'ui-monospace, SF Mono, monospace',
                fontSize: 10, color: '#98989D',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 999, padding: '2px 7px',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              Induction
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null)

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', 'all'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const snap = await getDocs(ref)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 5 * 60 * 1000,
  })

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

  return (
    <div className="flex flex-col w-full animate-fade-in">

      {/* ── Hero tagline ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
            fontWeight: 600,
            fontSize: 'clamp(36px, 5vw, 64px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            color: '#F5F5F7',
            marginBottom: 10,
          }}
        >
          Book time on real machines.
        </h1>
        <p style={{ color: '#98989D', fontSize: 15 }}>
          Reserve equipment, manage sessions, and track your projects — all in one place.
        </p>
      </div>

      {/* ── Live status ticker ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex', gap: 20, marginBottom: 32,
          padding: '10px 16px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.03)',
          width: 'fit-content',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#F5F5F7', fontFamily: 'ui-monospace, SF Mono, monospace' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759', display: 'inline-block', flexShrink: 0 }} />
          {availableCount} available
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#F5F5F7', fontFamily: 'ui-monospace, SF Mono, monospace' }}>
          <span className="animate-status-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF9500', display: 'inline-block', flexShrink: 0 }} />
          {inUseCount} in use
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#98989D', fontFamily: 'ui-monospace, SF Mono, monospace' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8E8E93', display: 'inline-block', flexShrink: 0 }} />
          {offlineCount} offline
        </div>
      </div>

      {/* ── Category Tiles ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 40,
        }}
      >
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

      {/* ── Section header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2
          style={{
            fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
            fontWeight: 600, fontSize: 22, letterSpacing: '-0.01em',
            color: '#F5F5F7',
          }}
        >
          {activeMeta ? activeMeta.label : 'All Machines'}
          <span style={{ fontWeight: 400, fontSize: 16, color: '#98989D', marginLeft: 10 }}>
            {filteredEquipment.length}
          </span>
        </h2>
        {activeCategory && (
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              fontSize: 13, color: '#0A84FF',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
            }}
          >
            Show all →
          </button>
        )}
      </div>

      {/* ── Equipment Grid ──────────────────────────────────────── */}
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
                animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
              }}
            />
          ))}
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div
          style={{
            padding: '64px 0', textAlign: 'center',
            color: '#98989D', fontSize: 15,
            fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
          }}
        >
          No sessions booked yet. Find a machine and grab a slot.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {filteredEquipment.map(eq => {
            const meta = CATEGORY_META.find(c => c.id === eq.category)
            return (
              <EquipmentCard
                key={eq.id}
                eq={eq}
                categoryAccent={meta?.accent ?? '#98989D'}
                onClick={() => navigate(`/equipment/${eq.id}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

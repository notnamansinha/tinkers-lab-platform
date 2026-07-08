import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDocument, getDocumentsWhere, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Equipment, Booking } from '@/types'
import { toast } from 'sonner'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ArrowLeft, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────
function statusInfo(status: Equipment['status']): { label: string; color: string; pulse: boolean } {
  switch (status) {
    case 'available':         return { label: 'Available',     color: '#34C759', pulse: false }
    case 'in_use':
    case 'reserved':          return { label: 'In Use',        color: '#FF9500', pulse: true  }
    case 'under_maintenance': return { label: 'Maintenance',   color: '#8E8E93', pulse: false }
    case 'out_of_service':    return { label: 'Out of Service',color: '#FF3B30', pulse: false }
    case 'retired':           return { label: 'Retired',       color: '#8E8E93', pulse: false }
    default:                  return { label: status,          color: '#8E8E93', pulse: false }
  }
}

// Build the next 7 days starting from today
function buildDays(): { label: string; date: string }[] {
  const days: { label: string; date: string }[] = []
  const now = new Date()
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const yyyy = d.getFullYear()
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    const label = i === 0
      ? 'Today'
      : i === 1
        ? 'Tomorrow'
        : `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`
    days.push({ label, date: `${yyyy}-${mm}-${dd}` })
  }
  return days
}

// LAB hours: 09:00–18:00, 1h slots
const LAB_HOURS = ['09','10','11','12','13','14','15','16','17']

// ── Info Row ───────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr',
        gap: 8,
        padding: '12px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        fontSize: 14,
        alignItems: 'start',
      }}
    >
      <span style={{ color: '#98989D', fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif' }}>{label}</span>
      <span style={{ color: '#F5F5F7', fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif' }}>{value}</span>
    </div>
  )
}

export default function EquipmentDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile, user } = useAuth()

  const [selectedDay,  setSelectedDay]  = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isBooking,    setIsBooking]    = useState(false)

  const days = buildDays()

  // Default active day = today
  const activeDay = selectedDay || days[0].date

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getDocument<Equipment>(COLLECTIONS.EQUIPMENT, id!),
    enabled: !!id,
  })

  const { data: recentBookings = [], refetch } = useQuery({
    queryKey: ['bookings', 'equipment', id],
    queryFn: () => getDocumentsWhere<Booking>(COLLECTIONS.BOOKINGS, 'equipmentId', '==', id!, 50),
    enabled: !!id,
    staleTime: 0,
  })

  if (isLoading) return (
    <div style={{ color: '#98989D', fontFamily: 'ui-monospace, SF Mono, monospace', padding: '32px 0', fontSize: 14 }}>
      Loading…
    </div>
  )

  if (!equipment) return (
    <div style={{ padding: '64px 0' }}>
      <p style={{ color: '#FF3B30', fontFamily: 'ui-monospace, SF Mono, monospace', marginBottom: 16 }}>
        ERR: Equipment not found
      </p>
      <button
        onClick={() => navigate('/equipment')}
        style={{ color: '#0A84FF', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
      >
        ← Return to catalog
      </button>
    </div>
  )

  const si = statusInfo(equipment.status)
  const isAvailableForBooking = equipment.status === 'available' || equipment.status === 'reserved'
  const myBookingsCount = recentBookings.filter(b => b.userId === user?.uid).length

  // Bookings for the active day
  const dayBookings = recentBookings.filter(b => b.date === activeDay)

  const isSlotTaken = (hour: string) => {
    const slotTime = `${hour}:00`
    return dayBookings.some(b => b.startTime <= slotTime && b.endTime > slotTime)
  }

  const isMySlot = (hour: string) => {
    const slotTime = `${hour}:00`
    return dayBookings.some(b => b.userId === user?.uid && b.startTime <= slotTime && b.endTime > slotTime)
  }

  const handleBook = async () => {
    if (!selectedSlot || !user) return
    setIsBooking(true)
    try {
      await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
        equipmentId: id,
        machineId:   equipment.machineId,
        machineName: equipment.name,
        userId:      user.uid,
        userEmail:   user.email,
        userName:    profile?.displayName || user.email,
        date:        activeDay,
        startTime:   `${selectedSlot}:00`,
        endTime:     `${String(parseInt(selectedSlot) + 1).padStart(2, '0')}:00`,
        status:      'approved',
        purpose:     'Session',
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      })
      toast.success('Booking confirmed.')
      setSelectedSlot(null)
      refetch()
    } catch {
      toast.error('Conflict: This slot is unavailable.')
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, paddingBottom: 64 }} className="animate-fade-in">

      {/* ── Back ─────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#98989D', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 14, marginBottom: 28,
          fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
          transition: 'color 200ms ease',
        }}
        onMouseEnter={el => { ;(el.currentTarget as HTMLElement).style.color = '#F5F5F7' }}
        onMouseLeave={el => { ;(el.currentTarget as HTMLElement).style.color = '#98989D' }}
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* ── Photo ────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%', aspectRatio: '16/8',
          borderRadius: 20,
          overflow: 'hidden',
          background: '#0D0E10',
          marginBottom: 28,
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {equipment.imageUrls?.[0] ? (
          <img
            src={equipment.imageUrls[0]}
            alt={equipment.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{
            fontFamily: 'ui-monospace, SF Mono, monospace',
            fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.08em',
          }}>
            NO IMAGE
          </span>
        )}
      </div>

      {/* ── Title + status dot ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
            fontWeight: 600, fontSize: 26, letterSpacing: '-0.01em', lineHeight: 1.2,
            color: '#F5F5F7',
          }}
        >
          {equipment.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <span
            className={cn('inline-block rounded-full', si.pulse && 'animate-status-pulse')}
            style={{ width: 9, height: 9, background: si.color }}
          />
          <span
            style={{
              fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
              fontSize: 14, color: '#F5F5F7',
            }}
          >
            {si.label}
          </span>
        </div>
      </div>

      {/* ── Info rows group ──────────────────────────────────────── */}
      <div
        style={{
          background: '#141518',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          marginBottom: 32,
        }}
      >
        <InfoRow label="Location" value={equipment.location || 'Unknown'} />
        <InfoRow
          label="Induction"
          value={
            equipment.requiresTraining
              ? <span>Required <span style={{ color: '#34C759' }}>· Cleared</span></span>
              : 'No training required'
          }
        />
        <InfoRow label="Max session" value="3 hrs" />
        <InfoRow
          label="Your bookings"
          value={`${myBookingsCount} session${myBookingsCount !== 1 ? 's' : ''} this month`}
        />
        {equipment.description && (
          <InfoRow label="About" value={equipment.description} />
        )}
      </div>

      {/* ── Slot picker ─────────────────────────────────────────── */}
      {isAvailableForBooking && (
        <>
          {/* Day tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
            {days.slice(0, 5).map(d => {
              const isActiveD = activeDay === d.date
              return (
                <button
                  key={d.date}
                  onClick={() => { setSelectedDay(d.date); setSelectedSlot(null) }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 999,
                    fontSize: 13, fontWeight: 500,
                    border: isActiveD ? 'none' : '1px solid rgba(255,255,255,0.14)',
                    background: isActiveD ? '#0A84FF' : 'transparent',
                    color: isActiveD ? '#fff' : '#98989D',
                    cursor: 'pointer',
                    transition: 'background 200ms ease, color 200ms ease',
                    fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {d.label}
                </button>
              )
            })}
          </div>

          {/* Hour slots */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
            {LAB_HOURS.map(hour => {
              const taken    = isSlotTaken(hour)
              const mine     = isMySlot(hour)
              const selected = selectedSlot === hour
              const endHour  = String(parseInt(hour) + 1).padStart(2, '0')

              return (
                <button
                  key={hour}
                  disabled={taken && !mine}
                  onClick={() => !taken && setSelectedSlot(selected ? null : hour)}
                  title={mine ? 'Your booking' : taken ? 'Slot taken' : ''}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontFamily: 'ui-monospace, SF Mono, monospace',
                    border: selected
                      ? 'none'
                      : mine
                        ? '1px solid rgba(52,199,89,0.45)'
                        : '1px solid rgba(255,255,255,0.14)',
                    background: selected
                      ? '#0A84FF'
                      : mine
                        ? 'rgba(52,199,89,0.12)'
                        : 'transparent',
                    color: selected
                      ? '#fff'
                      : mine
                        ? '#34C759'
                        : taken
                          ? 'rgba(255,255,255,0.2)'
                          : '#F5F5F7',
                    cursor: taken && !mine ? 'not-allowed' : 'pointer',
                    opacity: taken && !mine ? 0.4 : 1,
                    transition: 'background 200ms ease, border-color 200ms ease',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {taken && !mine && <Lock size={10} />}
                  {hour}:00 – {endHour}:00
                </button>
              )
            })}
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {selectedSlot ? (
              <button
                onClick={handleBook}
                disabled={isBooking}
                className="animate-press"
                style={{
                  borderRadius: 999,
                  background: '#0A84FF',
                  color: '#fff',
                  fontWeight: 600, fontSize: 15,
                  padding: '11px 36px',
                  border: 'none', cursor: isBooking ? 'not-allowed' : 'pointer',
                  fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
                  transition: 'background 200ms ease, transform 300ms cubic-bezier(0.32,0.72,0,1)',
                  opacity: isBooking ? 0.6 : 1,
                }}
              >
                {isBooking
                  ? 'Booking…'
                  : `Book ${selectedSlot}:00 – ${String(parseInt(selectedSlot)+1).padStart(2,'0')}:00`
                }
              </button>
            ) : (
              <p style={{ color: '#98989D', fontSize: 14, fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif' }}>
                Select a slot above to book
              </p>
            )}
          </div>
        </>
      )}

      {/* Blocked — not bookable */}
      {!isAvailableForBooking && (
        <div
          style={{
            padding: '20px 20px', borderRadius: 14,
            background: 'rgba(255,59,48,0.08)',
            border: '1px solid rgba(255,59,48,0.20)',
            color: '#FF3B30',
            fontSize: 14,
            fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
          }}
        >
          This machine is currently unavailable — {si.label.toLowerCase()}.
          Contact the lab to request access or report an issue.
        </div>
      )}
    </div>
  )
}

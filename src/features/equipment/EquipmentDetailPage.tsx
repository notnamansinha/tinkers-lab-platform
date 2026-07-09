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
    <div className="w-full max-w-5xl mx-auto pb-20 animate-in fade-in duration-300">
      
      {/* ── Back ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/50 hover:text-white font-bold mb-6 transition-colors uppercase tracking-widest text-xs"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Photo & Details */}
        <div className="space-y-8">
          {/* Photo */}
          <div className="aspect-[4/3] rounded-[32px] border-4 border-black bg-black overflow-hidden shadow-[4px_4px_0_0_#000]">
            {equipment.imageUrls?.[0] ? (
              <img
                src={equipment.imageUrls[0]}
                alt={equipment.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-white/20 text-xs tracking-widest uppercase">
                NO IMAGE
              </div>
            )}
          </div>

          {/* Details Panel */}
          <div className="tl-panel-cream p-6 lg:p-8 rounded-[32px]">
            <div className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-4 py-3 border-b-2 border-black/10">
                <span className="font-bold text-black/50 uppercase tracking-widest text-xs">Location</span>
                <span className="font-bold text-black">{equipment.location || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-4 py-3 border-b-2 border-black/10">
                <span className="font-bold text-black/50 uppercase tracking-widest text-xs">Induction</span>
                <span className="font-bold text-black">
                  {equipment.requiresTraining ? (
                    <span className="flex items-center gap-2">Required <span className="text-lime">●</span> Cleared</span>
                  ) : 'No training required'}
                </span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-4 py-3 border-b-2 border-black/10">
                <span className="font-bold text-black/50 uppercase tracking-widest text-xs">Max session</span>
                <span className="font-bold text-black">3 hrs</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-4 py-3 border-b-2 border-black/10">
                <span className="font-bold text-black/50 uppercase tracking-widest text-xs">My bookings</span>
                <span className="font-bold text-black">{myBookingsCount} session{myBookingsCount !== 1 ? 's' : ''} this month</span>
              </div>
              {equipment.description && (
                <div className="grid grid-cols-[100px_1fr] gap-4 py-3">
                  <span className="font-bold text-black/50 uppercase tracking-widest text-xs">About</span>
                  <span className="font-bold text-black leading-relaxed">{equipment.description}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Booking Flow */}
        <div className="space-y-8">
          {/* Title & Status */}
          <div className="tl-panel-indigo p-6 lg:p-8 rounded-[32px]">
            <div className="flex items-center gap-3 mb-4">
              <span className={cn('w-4 h-4 rounded-full border-2 border-black', si.pulse && 'animate-status-pulse')} style={{ background: si.color }} />
              <span className="font-bold text-white uppercase tracking-widest text-sm">{si.label}</span>
            </div>
            <h1 className="font-['Arial_Black'] uppercase text-4xl lg:text-5xl font-black text-white tracking-tight leading-[0.95]">
              {equipment.name}
            </h1>
          </div>

          {/* Slot picker */}
          {isAvailableForBooking && (
            <div className="bg-[#101010] border-4 border-[#191919] p-6 lg:p-8 rounded-[32px] shadow-2xl">
              <h3 className="font-['Arial_Black'] uppercase text-xl text-white mb-6">Select a Slot</h3>
              
              {/* Day tabs */}
              <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {days.slice(0, 5).map(d => {
                  const isActiveD = activeDay === d.date
                  return (
                    <button
                      key={d.date}
                      onClick={() => { setSelectedDay(d.date); setSelectedSlot(null) }}
                      className={cn(
                        "px-5 py-2 rounded-full font-bold uppercase tracking-widest text-xs whitespace-nowrap transition-colors border-2",
                        isActiveD ? "bg-lime text-black border-lime" : "bg-transparent text-white/50 border-white/20 hover:border-white/50 hover:text-white"
                      )}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>

              {/* Hour slots */}
              <div className="flex flex-wrap gap-3 mb-8">
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
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-[16px] font-bold text-sm transition-all border-2",
                        selected
                          ? "bg-pink text-black border-black shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                          : mine
                            ? "bg-lime/20 text-lime border-lime/40"
                            : taken
                              ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                              : "bg-[#1a1a1a] text-white border-[#333] hover:border-pink hover:text-pink"
                      )}
                    >
                      {taken && !mine && <Lock size={14} className="opacity-50" />}
                      {hour}:00 – {endHour}:00
                    </button>
                  )
                })}
              </div>

              {/* CTA */}
              <div className="pt-6 border-t-4 border-[#191919]">
                {selectedSlot ? (
                  <button
                    onClick={handleBook}
                    disabled={isBooking}
                    className="w-full tl-pill-button flex justify-center items-center py-4 text-lg"
                  >
                    {isBooking
                      ? 'Booking…'
                      : `Book ${selectedSlot}:00 – ${String(parseInt(selectedSlot)+1).padStart(2,'0')}:00`
                    }
                  </button>
                ) : (
                  <div className="w-full text-center py-4 rounded-[20px] bg-white/5 border-2 border-dashed border-white/20 text-white/50 font-bold uppercase tracking-widest text-xs">
                    Select a slot above to book
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Blocked — not bookable */}
          {!isAvailableForBooking && (
            <div className="bg-orange/20 border-4 border-orange p-6 lg:p-8 rounded-[32px] text-orange">
              <h3 className="font-['Arial_Black'] uppercase text-xl mb-2">Unavailable</h3>
              <p className="font-bold">
                This machine is currently {si.label.toLowerCase()}.
                Contact the lab to request access or report an issue.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

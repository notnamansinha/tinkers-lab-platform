import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { createBooking, getBookingsForSlot } from '@/services/firebase/bookings'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Lock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import type { Equipment, Booking } from '@/types'

// ── Schema ─────────────────────────────────────────────────────────────────
const bookingSchema = z.object({
  equipmentId: z.string().min(1, 'Select a machine'),
  date:        z.string().min(1, 'Select a date'),
  startTime:   z.string().min(1, 'Select start time'),
  endTime:     z.string().min(1, 'Select end time'),
  purpose:     z.string().min(10, 'Describe purpose (min 10 chars)'),
  projectId:   z.string().optional(),
}).refine(d => d.startTime < d.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
})
type BookingFormData = z.infer<typeof bookingSchema>

const TIME_SLOTS = [
  '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00',
]

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2
        style={{
          fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
          fontWeight: 600, fontSize: 17, color: '#F5F5F7',
          marginBottom: 12, letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          background: '#141518',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function FieldRow({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <label
        style={{
          display: 'block', fontSize: 12,
          color: '#98989D', marginBottom: 6,
          fontFamily: 'ui-monospace, SF Mono, monospace',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p style={{ color: '#FF3B30', fontSize: 12, marginTop: 4,
          fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif' }}>
          {error}
        </p>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 10, color: '#F5F5F7', fontSize: 14,
  fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
  outline: 'none',
}

export default function BookingFormPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, profile } = useAuth()

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const ref  = collection(db, COLLECTIONS.EQUIPMENT)
      const q    = query(ref, orderBy('name', 'asc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 15 * 60 * 1000,
  })

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      equipmentId: params.get('machine') || '',
      date: todayStr(),
    },
  })

  const watchEquipmentId = watch('equipmentId')
  const watchDate        = watch('date')
  const watchStart       = watch('startTime')

  const { data: existingBookings = [] } = useQuery({
    queryKey: ['bookings', 'slot', watchEquipmentId, watchDate],
    queryFn:  () => getBookingsForSlot(watchEquipmentId, watchDate),
    enabled:  !!watchEquipmentId && !!watchDate,
    staleTime: 60 * 1000,
  })

  const selectedEquipment = equipment.find(e => e.id === watchEquipmentId)

  const isTimeBooked = (time: string) =>
    existingBookings.some(b => b.startTime <= time && b.endTime > time)

  const onSubmit = async (data: BookingFormData) => {
    if (!user || !profile) { toast.error('Please sign in'); return }
    const machine = equipment.find(e => e.id === data.equipmentId)
    if (!machine) { toast.error('Machine not found'); return }
    try {
      await createBooking({
        equipmentId: data.equipmentId,
        machineId:   machine.machineId,
        machineName: machine.name,
        userId:      user.uid,
        userEmail:   user.email!,
        userName:    profile.displayName,
        date:        data.date,
        startTime:   data.startTime,
        endTime:     data.endTime,
        purpose:     data.purpose,
        projectId:   data.projectId,
      })
      toast.success('Booking submitted! Awaiting staff approval.')
      navigate('/bookings')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit booking')
    }
  }

  return (
    <div style={{ maxWidth: 600, paddingBottom: 64 }} className="animate-fade-in">

      {/* ── Back + Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#98989D',
            transition: 'color 200ms ease, background 200ms ease',
          }}
          onMouseEnter={el => { ;(el.currentTarget as HTMLElement).style.color = '#F5F5F7' }}
          onMouseLeave={el => { ;(el.currentTarget as HTMLElement).style.color = '#98989D' }}
        >
          <ArrowLeft size={15} />
        </button>
        <div>
          <h1
            style={{
              fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
              fontWeight: 600, fontSize: 24, letterSpacing: '-0.01em',
              color: '#F5F5F7', lineHeight: 1.15,
            }}
          >
            New Booking
          </h1>
          <p style={{ color: '#98989D', fontSize: 13, marginTop: 2 }}>
            Reserve a machine for your project.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Machine ────────────────────────────────────────────── */}
        <Section title="Equipment">
          <FieldRow label="Machine" error={errors.equipmentId?.message}>
            <select
              {...register('equipmentId')}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">— Select a machine —</option>
              {equipment
                .filter(e => ['available', 'reserved'].includes(e.status))
                .map(e => (
                  <option key={e.id} value={e.id}>{e.name} · {e.category}</option>
                ))}
            </select>
          </FieldRow>

          {selectedEquipment && (
            <div style={{ padding: '12px 18px' }}>
              <p style={{
                fontSize: 13, color: '#98989D',
                fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
                lineHeight: 1.5,
              }}>
                {selectedEquipment.description}
              </p>
              {selectedEquipment.requiresTraining && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
                  color: '#FF9500', fontSize: 13,
                  fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
                }}>
                  <AlertTriangle size={13} />
                  Training required — ensure you are certified before booking.
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Date & Time ────────────────────────────────────────── */}
        <Section title="Date & Time">
          <FieldRow label="Date" error={errors.date?.message}>
            <input
              type="date"
              min={todayStr()}
              style={inputStyle}
              {...register('date')}
            />
          </FieldRow>

          {/* Existing conflicts inline */}
          {existingBookings.length > 0 && (
            <div
              style={{
                margin: '0 18px 4px',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(255,149,0,0.08)',
                border: '1px solid rgba(255,149,0,0.20)',
                fontSize: 12, color: '#FF9500',
                fontFamily: 'ui-monospace, SF Mono, monospace',
              }}
            >
              <p style={{ marginBottom: 4, fontWeight: 600 }}>Existing bookings on this date:</p>
              {existingBookings.map(b => (
                <div key={b.id}>• {b.startTime}–{b.endTime} ({b.status})</div>
              ))}
            </div>
          )}

          {/* Start time — pill slots */}
          <FieldRow label="Start time" error={errors.startTime?.message}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {TIME_SLOTS.slice(0, -1).map(t => {
                const booked   = isTimeBooked(t)
                const selected = watchStart === t
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={booked}
                    onClick={() => setValue('startTime', t, { shouldValidate: true })}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999, fontSize: 12,
                      fontFamily: 'ui-monospace, SF Mono, monospace',
                      border: selected ? 'none' : '1px solid rgba(255,255,255,0.14)',
                      background: selected ? '#0A84FF' : 'transparent',
                      color: selected ? '#fff' : booked ? 'rgba(255,255,255,0.2)' : '#F5F5F7',
                      cursor: booked ? 'not-allowed' : 'pointer',
                      opacity: booked ? 0.4 : 1,
                      transition: 'background 150ms ease',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {booked && <Lock size={9} />}{t}
                  </button>
                )
              })}
            </div>
          </FieldRow>

          {/* End time — pill slots (only show times after selected start) */}
          <FieldRow label="End time" error={errors.endTime?.message}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {TIME_SLOTS.slice(1).map(t => {
                const booked   = isTimeBooked(t)
                const selected = watch('endTime') === t
                const valid    = !watchStart || t > watchStart
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={booked || !valid}
                    onClick={() => setValue('endTime', t, { shouldValidate: true })}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999, fontSize: 12,
                      fontFamily: 'ui-monospace, SF Mono, monospace',
                      border: selected ? 'none' : '1px solid rgba(255,255,255,0.14)',
                      background: selected ? '#0A84FF' : 'transparent',
                      color: selected ? '#fff' : (booked || !valid) ? 'rgba(255,255,255,0.2)' : '#F5F5F7',
                      cursor: (booked || !valid) ? 'not-allowed' : 'pointer',
                      opacity: (booked || !valid) ? 0.4 : 1,
                      transition: 'background 150ms ease',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {booked && <Lock size={9} />}{t}
                  </button>
                )
              })}
            </div>
          </FieldRow>
        </Section>

        {/* ── Purpose ────────────────────────────────────────────── */}
        <Section title="Purpose">
          <FieldRow label="Description" error={errors.purpose?.message}>
            <textarea
              rows={4}
              placeholder="Describe what you will be working on..."
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
              {...register('purpose')}
            />
          </FieldRow>
          <FieldRow label="Project ID (optional)">
            <input
              type="text"
              placeholder="e.g. TL-001"
              style={inputStyle}
              {...register('projectId')}
            />
          </FieldRow>
        </Section>

        {/* ── Actions ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#F5F5F7', cursor: 'pointer',
              fontFamily: '-apple-system, SF Pro Text, Inter, sans-serif',
              transition: 'background 150ms ease',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="animate-press"
            style={{
              padding: '10px 24px', borderRadius: 999, fontSize: 14, fontWeight: 600,
              background: '#0A84FF', border: 'none',
              color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.65 : 1,
              fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
              transition: 'background 150ms ease, transform 300ms cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Booking'}
          </button>
        </div>
      </form>
    </div>
  )
}

import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { updateBookingStatus } from '@/services/firebase/bookings'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react'
import { formatDateTime, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Booking } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isStaff, user, profile } = useAuth()
  const qc = useQueryClient()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['bookings', id],
    queryFn: () => getDocument<Booking>(COLLECTIONS.BOOKINGS, id!),
    enabled: !!id,
  })

  if (isLoading) return <LoadingSpinner text="Loading booking…" />
  if (!booking) return <div className="py-16 text-center text-muted-foreground">Booking not found. <Link to="/bookings" className="text-primary hover:underline">← Back</Link></div>

  const canManage = isStaff || booking.userId === user?.uid

  const approve = async () => {
    await updateBookingStatus(id!, 'approved', profile?.displayName || 'Staff')
    toast.success('Approved'); qc.invalidateQueries({ queryKey: ['bookings'] })
  }
  const reject = async () => {
    const reason = window.prompt('Rejection reason:') || ''
    await updateBookingStatus(id!, 'rejected', undefined, reason)
    toast.success('Rejected'); qc.invalidateQueries({ queryKey: ['bookings'] })
  }
  const cancel = async () => {
    if (!window.confirm('Cancel this booking?')) return
    await updateBookingStatus(id!, 'cancelled')
    toast.success('Cancelled'); navigate('/bookings')
  }

  const statusColor = { pending: 'bg-orange-100 text-orange-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600', completed: 'bg-blue-100 text-blue-700' }[booking.status] || 'bg-gray-100'

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <p className="text-xs font-mono text-muted-foreground">Booking #{id?.slice(-8).toUpperCase()}</p>
          <h1 className="text-2xl font-display font-bold">{booking.machineName}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}>{booking.status}</span>
      </div>

      <div className="rounded-lg border bg-card p-5 grid grid-cols-2 gap-4">
        {[
          ['Machine', booking.machineName],
          ['Date', booking.date],
          ['Time', `${booking.startTime} – ${booking.endTime}`],
          ['Booked by', booking.userName || booking.userEmail],
          ['Purpose', booking.purpose],
          ['Project ID', booking.projectId || '—'],
          ['Submitted', formatDateTime(booking.createdAt)],
          ['Approved by', booking.approvedBy || '—'],
          ['Rejection reason', booking.rejectionReason || '—'],
        ].map(([k, v]) => (
          <div key={k} className={k === 'Purpose' ? 'col-span-2' : ''}>
            <p className="text-xs text-muted-foreground font-mono">{k}</p>
            <p className="text-sm font-medium mt-0.5">{String(v)}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      {canManage && booking.status === 'pending' && (
        <div className="flex gap-3">
          {isStaff && <button onClick={approve} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"><CheckCircle size={16} /> Approve</button>}
          {isStaff && <button onClick={reject} className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700"><XCircle size={16} /> Reject</button>}
          <button onClick={cancel} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel booking</button>
        </div>
      )}
      {booking.status === 'approved' && booking.userId === user?.uid && (
        <button onClick={cancel} className="px-4 py-2.5 border border-red-200 text-red-600 rounded-md text-sm hover:bg-red-50">Cancel booking</button>
      )}
    </div>
  )
}

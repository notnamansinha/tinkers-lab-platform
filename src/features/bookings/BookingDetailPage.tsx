import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { updateBookingStatus } from '@/services/firebase/bookings'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { Booking } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
    await updateBookingStatus(id!, 'approved')
    toast.success('Approved')
    qc.invalidateQueries({ queryKey: ['bookings'] })
  }
  
  const reject = async () => {
    const reason = window.prompt('Rejection reason:') || ''
    await updateBookingStatus(id!, 'rejected', { rejectionReason: reason })
    toast.success('Rejected')
    qc.invalidateQueries({ queryKey: ['bookings'] })
  }
  
  const cancel = async () => {
    if (!window.confirm('Cancel this booking?')) return
    await updateBookingStatus(id!, 'cancelled')
    toast.success('Cancelled')
    navigate('/bookings')
  }

  const badgeVariant = {
    approved: 'default',
    rejected: 'destructive',
    cancelled: 'outline',
    completed: 'secondary'
  }[booking.status] as any || 'outline'

  return (
    <div className="container py-6 mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm font-mono text-muted-foreground">Booking #{id?.slice(-8).toUpperCase()}</p>
          <h1 className="text-3xl font-bold tracking-tight">{booking.machineName}</h1>
        </div>
        <Badge variant={badgeVariant} className="text-sm px-3 py-1 capitalize">
          {booking.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>Reservation and project information.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Machine</p>
            <p className="font-medium">{booking.machineName}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date & Time</p>
            <p className="font-medium">{booking.date} · {booking.startTime}–{booking.endTime}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Booked By</p>
            <p className="font-medium">{booking.userName || booking.userEmail}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Project ID</p>
            <p className="font-medium font-mono">{booking.projectId || '—'}</p>
          </div>

          <div className="col-span-full space-y-1 bg-muted/30 p-4 rounded-lg border">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Purpose</p>
            <p className="font-medium mt-1">{booking.purpose}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Submitted</p>
            <p className="font-medium text-sm">{formatDateTime(booking.createdAt)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</p>
            <p className="font-medium text-sm capitalize">{booking.status}</p>
          </div>

          {booking.status === 'rejected' && (
            <div className="col-span-full space-y-1 bg-destructive/10 border-destructive/20 border p-4 rounded-lg">
              <p className="text-xs text-destructive font-medium uppercase tracking-wider">Rejection Reason</p>
              <p className="font-medium text-sm text-destructive mt-1">{booking.rejectionReason || 'No reason provided.'}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/30 border-t px-6 py-4 flex flex-wrap gap-3">
          {booking.status === 'approved' && (
            <>
              {isStaff && (
                <Button onClick={reject} variant="destructive" className="gap-2">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              )}
              {booking.userId === user?.uid && (
                <Button onClick={cancel} variant="outline" className="gap-2 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" /> Cancel Booking
                </Button>
              )}
            </>
          )}
          {booking.status !== 'approved' && (
            <p className="text-sm text-muted-foreground">No actions available.</p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

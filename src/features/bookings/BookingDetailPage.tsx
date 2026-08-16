import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { updateBookingStatus, getBookingById } from '@/services/firebase/bookings'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, XCircle, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isStaff, user, profile } = useAuth()
  const qc = useQueryClient()

  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectionReason, setRejectionReason] = React.useState('')
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['bookings', id],
    queryFn: () => getBookingById(id!),
    enabled: !!id,
  })

  if (isLoading) return <LoadingSpinner text="Loading booking…" />
  if (!booking) return <div className="py-16 text-center text-muted-foreground">Booking not found. <Link to="/bookings" className="text-primary hover:underline">← Back</Link></div>

  const reject = async () => {
    setActionLoading(true)
    try {
      await updateBookingStatus(booking.projectId, id!, 'rejected', {
        rejectionReason,
        actor: {
          uid: profile?.uid ?? user?.uid ?? 'admin',
          name: profile?.displayName ?? 'Coordinator',
          email: profile?.email ?? '',
        },
      })
      toast.success('Booking rejected')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      setRejectDialogOpen(false)
      setRejectionReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject booking')
    } finally {
      setActionLoading(false)
    }
  }

  const cancel = async () => {
    setActionLoading(true)
    try {
      await updateBookingStatus(booking.projectId, id!, 'cancelled', {
        cancelledBy: user?.uid ?? 'user',
        actor: {
          uid: profile?.uid ?? user?.uid ?? 'user',
          name: profile?.displayName ?? booking.userName,
          email: profile?.email ?? booking.userEmail,
        },
      })
      toast.success('Booking cancelled')
      navigate('/bookings')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel booking')
    } finally {
      setActionLoading(false)
      setCancelDialogOpen(false)
    }
  }

  const badgeVariant = {
    approved: 'default',
    rejected: 'destructive',
    cancelled: 'outline',
    completed: 'secondary'
  }[booking.status] as any || 'outline'

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4 animate-fade-in sm:space-y-6 sm:py-6">
       <div className="flex flex-wrap items-center gap-3 rounded-card bg-indigo p-5 sm:gap-4 sm:p-6 lg:p-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">Booking #{id?.slice(-8).toUpperCase()}</p>
           <h1 className="mt-2 text-[clamp(2.25rem,6vw,3.5rem)] font-extrabold tracking-[-0.05em] text-white">{booking.machineName}</h1>
          <p className="mt-3 text-sm font-medium text-white/65">Your booking details, safety acknowledgement, and approval status.</p>
        </div>
         <Badge variant={badgeVariant} className="shrink-0 px-3 py-1 text-sm capitalize">
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

          <div className="col-span-full space-y-1 rounded-md border border-hairline bg-charcoal p-4">
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
            <div className="col-span-full space-y-1 rounded-md border border-pink/30 bg-pink/10 p-4">
              <p className="text-xs text-destructive font-medium uppercase tracking-wider">Rejection Reason</p>
              <p className="font-medium text-sm text-destructive mt-1">{booking.rejectionReason || 'No reason provided.'}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 border-t border-hairline bg-charcoal px-6 py-4">
          {booking.status === 'approved' && (
            <>
              {isStaff && (
                <Button onClick={() => setRejectDialogOpen(true)} variant="destructive" className="gap-2">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              )}
              {booking.userId === user?.uid && (
                <Button onClick={() => setCancelDialogOpen(true)} variant="outline" className="gap-2 text-destructive hover:bg-destructive/10">
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

      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title="Reject Booking"
        description="Optionally provide a reason for rejection."
        onConfirm={reject}
        confirmLabel="Reject"
        variant="destructive"
        loading={actionLoading}
      >
        <Input
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Rejection reason (optional)"
          className="w-full"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Booking"
        description="Are you sure you want to cancel this booking? This action cannot be undone."
        onConfirm={cancel}
        confirmLabel="Cancel Booking"
        variant="destructive"
        loading={actionLoading}
      />
    </div>
  )
}

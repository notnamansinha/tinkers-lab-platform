import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDocument, getDocumentsWhere, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Equipment, Booking } from '@/types'
import { toast } from 'sonner'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Clock, MapPin, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState(false)

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getDocument<Equipment>(COLLECTIONS.EQUIPMENT, id!),
    enabled: !!id,
  })

  // In a real app we'd fetch bookings for the selected week.
  // We'll mock the grid display by fetching recent bookings.
  const { data: recentBookings = [], refetch } = useQuery({
    queryKey: ['bookings', 'equipment', id],
    queryFn: () => getDocumentsWhere<Booking>(COLLECTIONS.BOOKINGS, 'equipmentId', '==', id!, 20),
    enabled: !!id,
    staleTime: 0,
  })

  if (isLoading) return (
    <div className="max-w-[1000px] mx-auto py-12 flex flex-col gap-6">
      <Skeleton className="h-8 w-24 mb-4" />
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-48 w-full col-span-2" />
        <Skeleton className="h-48 w-full col-span-1" />
      </div>
    </div>
  )

  if (!equipment) return (
    <div className="flex flex-col items-center justify-center py-24">
      <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Equipment Not Found</h2>
      <Button variant="outline" onClick={() => navigate('/equipment')}>Return to Catalog</Button>
    </div>
  )

  const isDown = equipment.status === 'under_maintenance' || equipment.status === 'out_of_service' || equipment.status === 'retired'
  
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"
  let statusText = 'Available Now'
  if (isDown) {
    badgeVariant = "destructive"
    statusText = equipment.status.replace(/_/g, ' ')
  } else if (equipment.status === 'reserved' || equipment.status === 'in_use') {
    badgeVariant = "secondary"
    statusText = 'In Use'
  }

  // Calculate grid data (mocked for visual layout)
  const days = ['Mon 7', 'Tue 8', 'Wed 9', 'Thu 10', 'Fri 11']
  const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17']
  
  const myBookingsCount = recentBookings.filter(b => b.userId === user?.uid).length

  const handleBook = async () => {
    if (!selectedSlot || !user) return
    setIsBooking(true)
    try {
      const [day, hour] = selectedSlot.split('-')
      // Simulate booking
      await addDoc(collection(db, COLLECTIONS.BOOKINGS), {
        equipmentId: id,
        machineId: equipment.machineId,
        machineName: equipment.name,
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.displayName || user.email,
        date: `2026-07-${parseInt(day.split(' ')[1])}`,
        startTime: `${hour}:00`,
        endTime: `${parseInt(hour)+1}:00`,
        status: 'approved',
        purpose: 'Session',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      toast.success('Successfully booked.')
      setSelectedSlot(null)
      refetch()
    } catch (e) {
      toast.error('Conflict: This slot is unavailable.')
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in flex flex-col gap-6 pb-12">
      <Button variant="ghost" className="self-start gap-2 mb-2 text-muted-foreground" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Image and Details */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-border shadow-sm">
            <div className="aspect-square bg-muted relative">
              {equipment.imageUrls?.[0] ? (
                <img src={equipment.imageUrls[0]} alt={equipment.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">NO IMAGE</div>
              )}
            </div>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-2xl font-display">{equipment.name}</CardTitle>
                  <CardDescription className="uppercase mt-1 font-mono text-xs">{equipment.category}</CardDescription>
                </div>
                <Badge variant={badgeVariant} className="uppercase shrink-0">{statusText}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Location</p>
                    <p className="text-muted-foreground">{equipment.location || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Induction</p>
                    <p className="text-muted-foreground">{equipment.requiresTraining ? "Required — You're cleared" : "No training required"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Usage</p>
                    <p className="text-muted-foreground">Max 3 hrs/session. {myBookingsCount} booked.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Booking Grid */}
        <div className="lg:col-span-2">
          <Card className="h-full bg-background/50 backdrop-blur-sm border-border shadow-sm flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">Reserve a Slot</CardTitle>
              <CardDescription>Select an available block on the calendar below to book the machine.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-[600px]">
                  {/* Grid Header */}
                  <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-2 mb-2">
                    <div></div>
                    {days.map(d => (
                      <div key={d} className="text-center font-semibold text-sm text-foreground">{d}</div>
                    ))}
                  </div>
                  
                  {/* Grid Body */}
                  <div className="space-y-2">
                    {hours.map(hour => (
                      <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] gap-2 items-center">
                        <div className="text-right pr-4 text-xs font-mono text-muted-foreground">{hour}:00</div>
                        {days.map(day => {
                          const slotId = `${day}-${hour}`
                          const realDate = `2026-07-${parseInt(day.split(' ')[1]) < 10 ? '0' : ''}${day.split(' ')[1]}`
                          const realTime = `${hour}:00`
                          const booking = recentBookings.find(b => b.date === realDate && b.startTime === realTime)
                          
                          let isAvailable = true
                          let isMyBooking = false
                          
                          if (booking) {
                            isAvailable = false
                            if (booking.userId === user?.uid) isMyBooking = true
                          }

                          const isSelected = selectedSlot === slotId

                          let btnVariant: "outline" | "default" | "secondary" | "ghost" = "outline"
                          let btnClass = "h-10 rounded-md transition-all border-dashed"

                          if (isSelected) {
                            btnVariant = "default"
                            btnClass = "h-10 rounded-md ring-2 ring-primary ring-offset-2 ring-offset-background border-solid"
                          } else if (isMyBooking) {
                            btnVariant = "secondary"
                            btnClass = "h-10 rounded-md border-solid border-primary/50 text-primary opacity-80"
                          } else if (!isAvailable) {
                            btnVariant = "ghost"
                            btnClass = "h-10 rounded-md bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                          }

                          return (
                            <Button
                              key={day}
                              variant={btnVariant}
                              className={btnClass}
                              disabled={!isAvailable}
                              onClick={() => isAvailable && setSelectedSlot(slotId)}
                            >
                              {isMyBooking ? <CheckCircle className="h-4 w-4" /> : isSelected ? 'Selected' : ''}
                            </Button>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="p-6 pt-0 mt-auto border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedSlot ? (
                  <span>Selected: <strong>{selectedSlot.split('-')[0]}</strong> at <strong>{selectedSlot.split('-')[1]}:00</strong></span>
                ) : (
                  <span>Select a slot to continue</span>
                )}
              </div>
              <Button 
                onClick={handleBook}
                disabled={!selectedSlot || isBooking}
                className="w-40 font-bold"
              >
                {isBooking ? 'Processing...' : 'Confirm Booking'}
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}


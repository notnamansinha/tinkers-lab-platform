import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDocument, getDocumentsWhere, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Calendar, Edit } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Equipment, Booking, MaintenanceRecord } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isStaff } = useAuth()

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getDocument<Equipment>(COLLECTIONS.EQUIPMENT, id!),
    enabled: !!id,
  })

  const { data: recentBookings = [] } = useQuery({
    queryKey: ['bookings', 'equipment', id],
    queryFn: () => getDocumentsWhere<Booking>(COLLECTIONS.BOOKINGS, 'equipmentId', '==', id!, 10),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenance', 'equipment', id],
    queryFn: () => getDocumentsWhere<MaintenanceRecord>(COLLECTIONS.MAINTENANCE, 'equipmentId', '==', id!, 5),
    enabled: !!id && isStaff,
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) return <LoadingSpinner text="Loading equipment…" />
  if (!equipment) return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground">Equipment not found.</p>
      <Button variant="link" onClick={() => navigate('/equipment')}>← Back to equipment</Button>
    </div>
  )

  const statusVariant = {
    available: 'default',
    reserved: 'secondary',
    in_use: 'secondary',
    under_maintenance: 'destructive',
    out_of_service: 'destructive',
    retired: 'outline'
  }[equipment.status] as any || 'outline'

  return (
    <div className="container py-6 mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm font-mono text-muted-foreground">{equipment.machineId.toUpperCase()}</p>
          <h1 className="text-3xl font-bold tracking-tight">{equipment.name}</h1>
        </div>
        <Badge variant={statusVariant} className="text-sm px-3 py-1 capitalize">
          {equipment.status.replace('_', ' ')}
        </Badge>
        {isStaff && (
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/equipment/${id}/edit`)}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Specifications and training requirements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Category', equipment.category],
              ['Description', equipment.description],
              ['Location', equipment.location || '—'],
              ['Manufacturer', equipment.manufacturer || '—'],
              ['Model', equipment.modelNumber || '—'],
              ['Serial No.', equipment.serialNumber || '—'],
              ['Health', equipment.healthStatus],
              ['Training', equipment.requiresTraining ? 'Required' : 'Open use'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{k}</span>
                <span className="text-sm font-medium">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Info</CardTitle>
            <CardDescription>Warranty and lifecycle data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Purchase Date', formatDate(equipment.purchaseDate) || '—'],
              ['Install Date', formatDate(equipment.installationDate) || '—'],
              ['Warranty', equipment.warrantyInfo || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{k}</span>
                <span className="text-sm font-medium">{String(v)}</span>
              </div>
            ))}
          </CardContent>
          <CardFooter className="pt-4 border-t bg-muted/20">
            <Button className="w-full gap-2" onClick={() => navigate(`/bookings/new?machine=${id}`)}>
              <Calendar className="h-4 w-4" /> Book this machine
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Latest usage history for this machine.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {recentBookings.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm border-t sm:border-t-0">No bookings yet.</div>
          ) : (
            <div className="overflow-x-auto border-t sm:border-t-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Booked by</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBookings.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.date}</TableCell>
                      <TableCell className="font-mono text-xs">{b.startTime}–{b.endTime}</TableCell>
                      <TableCell>{b.userName || b.userEmail}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'approved' ? 'default' : b.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isStaff && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>Service records and schedules.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/maintenance/new?equipment=${id}`)}>
              + Schedule
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {maintenanceRecords.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm border-t sm:border-t-0">No maintenance records.</div>
            ) : (
              <div className="divide-y border-t sm:border-t-0">
                {maintenanceRecords.map(m => (
                  <div key={m.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">{m.type} · {m.technician}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-xs font-mono text-muted-foreground">{m.scheduledDate}</p>
                      <Badge variant={m.status === 'completed' ? 'default' : 'secondary'} className="capitalize text-[10px]">
                        {m.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

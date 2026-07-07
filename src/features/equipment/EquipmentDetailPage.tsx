import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDocument, getDocumentsWhere, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Calendar, Wrench, Edit, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Equipment, Booking, MaintenanceRecord } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

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
      <Link to="/equipment" className="text-primary hover:underline mt-2 inline-block">← Back to equipment</Link>
    </div>
  )

  const statusColor = { available: 'bg-green-100 text-green-700', reserved: 'bg-blue-100 text-blue-700', in_use: 'bg-orange-100 text-orange-700', under_maintenance: 'bg-yellow-100 text-yellow-700', out_of_service: 'bg-red-100 text-red-700', retired: 'bg-gray-100 text-gray-500' }[equipment.status] || 'bg-gray-100 text-gray-600'

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs font-mono text-muted-foreground">{equipment.machineId.toUpperCase()}</p>
          <h1 className="text-2xl font-display font-bold">{equipment.name}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>{equipment.status.replace('_', ' ')}</span>
        {isStaff && <Link to={`/equipment/${id}/edit`} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted"><Edit size={14} /> Edit</Link>}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Details</h2>
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
            <div key={k} className="flex gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{k}</span>
              <span className="text-sm">{v}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">Purchase Info</h2>
          {[
            ['Purchase Date', formatDate(equipment.purchaseDate) || '—'],
            ['Install Date', formatDate(equipment.installationDate) || '—'],
            ['Warranty', equipment.warrantyInfo || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{k}</span>
              <span className="text-sm">{String(v)}</span>
            </div>
          ))}
          <div className="pt-4 border-t">
            <Link to={`/bookings/new?machine=${id}`} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90">
              <Calendar size={16} /> Book this machine
            </Link>
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b"><h2 className="font-display font-semibold">Recent Bookings</h2></div>
        {recentBookings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No bookings yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs font-mono uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Booked by</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentBookings.map(b => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{b.date}</td>
                  <td className="px-4 py-2 font-mono text-xs">{b.startTime}–{b.endTime}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.userName || b.userEmail}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'approved' ? 'bg-green-100 text-green-700' : b.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Maintenance (staff only) */}
      {isStaff && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-display font-semibold">Maintenance History</h2>
            <Link to={`/maintenance/new?equipment=${id}`} className="text-xs text-primary hover:underline">+ Schedule</Link>
          </div>
          {maintenanceRecords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No maintenance records.</div>
          ) : (
            <div className="divide-y">
              {maintenanceRecords.map(m => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.type} · {m.technician}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono">{m.scheduledDate}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{m.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

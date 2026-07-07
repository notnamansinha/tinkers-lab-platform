import { Button } from '@/components/ui/button'
import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { ArrowLeft, Edit } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { MaintenanceRecord } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isStaff } = useAuth()

  const { data: record, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => getDocument<MaintenanceRecord>(COLLECTIONS.MAINTENANCE, id!),
    enabled: !!id,
  })

  if (isLoading) return <LoadingSpinner text="Loading…" />
  if (!record) return <div className="py-16 text-center text-muted-foreground">Record not found. <Link to="/maintenance" className="text-primary hover:underline">← Back</Link></div>

  const statusColor = { scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-orange-100 text-orange-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600' }[record.status]

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <p className="text-xs font-mono text-muted-foreground">{record.machineName} · {record.type}</p>
          <h1 className="text-xl font-display font-bold">{record.title}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>{record.status.replace('_',' ')}</span>
        {isStaff && <Link to={`/maintenance/${id}/edit`} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted"><Edit size={14}/> Edit</Link>}
      </div>
      <div className="rounded-lg border bg-card p-5 grid grid-cols-2 gap-4">
        {[['Machine', record.machineName], ['Type', record.type], ['Status', record.status.replace('_',' ')], ['Scheduled', record.scheduledDate], ['Completed', record.completedDate || '—'], ['Technician', record.technician], ['Technician Contact', record.technicianContact || '—'], ['Parts', record.parts || '—'], ['Labor Cost', record.laborCost ? `₹${record.laborCost}` : '—'], ['Parts Cost', record.partsCost ? `₹${record.partsCost}` : '—'], ['Downtime', record.downtimeHours ? `${record.downtimeHours}h` : '—']].map(([k, v]) => (
          <div key={k}><p className="text-xs text-muted-foreground font-mono">{k}</p><p className="text-sm font-medium mt-0.5">{String(v)}</p></div>
        ))}
        <div className="col-span-2"><p className="text-xs text-muted-foreground font-mono">Description</p><p className="text-sm mt-0.5">{record.description}</p></div>
        {record.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground font-mono">Notes</p><p className="text-sm mt-0.5">{record.notes}</p></div>}
      </div>
    </div>
  )
}

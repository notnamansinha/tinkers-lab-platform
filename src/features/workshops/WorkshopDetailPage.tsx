import { Button } from '@/components/ui/button'
import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ArrowLeft, Edit, Users, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Workshop } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function WorkshopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isStaff } = useAuth()
  const { data: workshop, isLoading } = useQuery({ queryKey: ['workshops', id], queryFn: async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.WORKSHOPS, id!))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as Workshop
    }, enabled: !!id })

  if (isLoading) return <LoadingSpinner text="Loading…" />
  if (!workshop) return <div className="py-16 text-center text-muted-foreground">Not found. <Link to="/workshops" className="text-primary hover:underline">← Back</Link></div>

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <p className="text-xs font-mono text-muted-foreground">{workshop.type.replace('_',' ')}</p>
          <h1 className="text-2xl font-display font-bold">{workshop.title}</h1>
        </div>
        {isStaff && <Link to={`/workshops/${id}/edit`} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted"><Edit size={14}/> Edit</Link>}
      </div>
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <p className="text-sm text-muted-foreground">{workshop.description}</p>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          {[['Date', workshop.date], ['Time', `${workshop.startTime}–${workshop.endTime}`], ['Location', workshop.location], ['Instructor', workshop.instructor], ['Email', workshop.instructorEmail || '—'], ['Capacity', `${workshop.registeredCount}/${workshop.capacity}`], ['Prerequisites', workshop.prerequisites || 'None'], ['Materials', workshop.materials || '—'], ['Certificate', workshop.certificateIssued ? 'Yes' : 'No']].map(([k,v]) => (
            <div key={k}><p className="text-xs text-muted-foreground font-mono">{k}</p><p className="text-sm font-medium">{String(v)}</p></div>
          ))}
        </div>
      </div>
    </div>
  )
}

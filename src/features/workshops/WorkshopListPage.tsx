import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { addDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Users, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import type { Workshop, WorkshopRegistration } from '@/types'

export default function WorkshopListPage() {
  const { user, profile, isStaff } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data: workshops = [], isLoading } = useQuery({
    queryKey: ['workshops'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.WORKSHOPS)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Workshop)
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = workshops.filter(w => !search || w.title.toLowerCase().includes(search.toLowerCase()))

  const register = async (workshopId: string, workshopTitle: string) => {
    if (!user || !profile) { toast.error('Please sign in'); return }
    try {
      await addDocument<WorkshopRegistration>(COLLECTIONS.WORKSHOP_REGISTRATIONS, {
        workshopId, workshopTitle,
        userId: user.uid, userName: profile.displayName, userEmail: user.email!,
        status: 'registered', certificateIssued: false,
      } as Omit<WorkshopRegistration,'id'|'createdAt'|'updatedAt'>)
      // Increment count
      const wRef = doc(db, COLLECTIONS.WORKSHOPS, workshopId)
      await updateDoc(wRef, { registeredCount: (workshops.find(w => w.id === workshopId)?.registeredCount ?? 0) + 1 })
      toast.success('Registered successfully!')
      qc.invalidateQueries({ queryKey: ['workshops'] })
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Workshops</p>
          <h1 className="text-2xl font-display font-bold mt-1">Workshops & Training</h1>
        </div>
        {isStaff && <Link to="/workshops/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 shrink-0"><Plus size={16} /> Add Workshop</Link>}
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workshops…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i) => <div key={i} className="h-40 rounded-lg border bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">No workshops scheduled.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(w => (
            <div key={w.id} className="rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{w.type.replace('_',' ')}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users size={12} />{w.registeredCount}/{w.capacity}</div>
                </div>
                <h3 className="font-display font-semibold text-base mt-2 cursor-pointer hover:text-primary" onClick={() => navigate(`/workshops/${w.id}`)}>{w.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{w.description}</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Calendar size={12} />
                  <span>{w.date} · {w.startTime}–{w.endTime}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Instructor: {w.instructor}</p>
                {w.prerequisites && <p className="text-xs text-orange-600 mt-1">Prerequisites: {w.prerequisites}</p>}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => register(w.id, w.title)} disabled={!w.isActive || w.registeredCount >= w.capacity} className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                    {w.registeredCount >= w.capacity ? 'Full' : 'Register'}
                  </button>
                  <Link to={`/workshops/${w.id}`} className="px-3 py-2 border rounded text-sm hover:bg-muted">Details</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

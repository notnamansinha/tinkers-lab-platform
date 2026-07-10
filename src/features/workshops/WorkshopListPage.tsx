import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Users, Calendar, MapPin, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import type { Workshop, WorkshopRegistration } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
      await addDoc(collection(db, COLLECTIONS.WORKSHOP_REGISTRATIONS), {
        workshopId, workshopTitle,
        userId: user.uid, userName: profile.displayName, userEmail: user.email!,
        status: 'registered', certificateIssued: false,
      } as Omit<WorkshopRegistration,'id'|'createdAt'|'updatedAt'>)
      
      const wRef = doc(db, COLLECTIONS.WORKSHOPS, workshopId)
      await updateDoc(wRef, { registeredCount: (workshops.find(w => w.id === workshopId)?.registeredCount ?? 0) + 1 })
      
      toast.success('Registered successfully!')
      qc.invalidateQueries({ queryKey: ['workshops'] })
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  return (
    <div className="space-y-6 container py-6 mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workshops & Training</h1>
          <p className="text-muted-foreground mt-1">Register for safety sessions, tool certifications, and workshops.</p>
        </div>
        {isStaff && (
          <Button className="shrink-0 gap-2" onClick={() => navigate('/workshops/new')}>
            <Plus className="h-4 w-4" /> Add Workshop
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search workshops..." 
          className="pl-9" 
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({length:3}).map((_,i) => <Card key={i} className="h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-24 text-center">
          <CardContent>
            <p className="text-muted-foreground">No workshops scheduled.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(w => {
            const isFull = w.registeredCount >= w.capacity
            return (
              <Card key={w.id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={w.isActive ? 'default' : 'secondary'} className="capitalize font-mono text-[10px]">
                      {w.type.replace('_',' ')}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {w.registeredCount}/{w.capacity}
                    </div>
                  </div>
                  <CardTitle className="text-xl leading-tight cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/workshops/${w.id}`)}>
                    {w.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {w.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-3 pb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="font-medium text-foreground">{w.date}</span>
                    <span>· {w.startTime} - {w.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{w.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span>Instructor: <span className="font-medium text-foreground">{w.instructor}</span></span>
                  </div>
                  
                  {w.prerequisites && (
                    <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-md">
                      <p className="text-xs text-orange-800 dark:text-orange-400 font-medium">Prerequisites:</p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">{w.prerequisites}</p>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="pt-0 border-t pt-4 mx-6 px-0 flex gap-3">
                  <Button 
                    onClick={() => register(w.id, w.title)} 
                    disabled={!w.isActive || isFull} 
                    className="flex-1"
                  >
                    {!w.isActive ? 'Closed' : isFull ? 'Full' : 'Register'}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/workshops/${w.id}`)}>
                    Details
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

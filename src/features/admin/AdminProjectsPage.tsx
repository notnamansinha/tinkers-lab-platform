import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Search, CheckCircle, XCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_COLOR = { pending: 'bg-orange-100 text-orange-700', active: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700', on_hold: 'bg-yellow-100 text-yellow-700', rejected: 'bg-red-100 text-red-700' }

export default function AdminProjectsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin', 'projects'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.PROJECTS)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Project)
    },
    staleTime: 5 * 60 * 1000,
  })

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.userName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const updateStatus = async (id: string, status: string, rejectionReason?: string) => {
    await updateDoc(doc(db, COLLECTIONS.PROJECTS, id), { status, rejectionReason: rejectionReason || null, reviewedBy: profile?.displayName, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    toast.success(`Project ${status}`)
    qc.invalidateQueries({ queryKey: ['admin', 'projects'] })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-accent">Admin · Projects</p>
        <h1 className="text-2xl font-display font-bold mt-1">All Projects</h1>
        <p className="text-muted-foreground text-sm">{projects.length} total · Latest to oldest · Approve or reject submissions.</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          {['pending','active','completed','on_hold','rejected'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Project ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, idx) => (
                  <TableRow>
                    <TableCell>{filtered.length - idx}</TableCell>
                    <TableCell>{(p as any).id || '—'}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{p.userName}</div>
                      <div className="text-xs text-muted-foreground">{p.userEmail}</div>
                    </TableCell>
                    <TableCell>{p.userType}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>{p.startDate}</TableCell>
                    <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] || 'bg-gray-100'}`}>{p.status}</span></TableCell>
                    <TableCell>
                      {p.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => updateStatus(p.id, 'active')}><CheckCircle size={14} /></Button>
                          <button onClick={() => { const r = window.prompt('Rejection reason:') || ''; updateStatus(p.id, 'rejected', r) }} className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200" title="Reject"><XCircle size={14} /></button>
                        </div>
                      )}
                      {p.status !== 'pending' && <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t">
              {filtered.length} of {projects.length} projects · Latest first
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

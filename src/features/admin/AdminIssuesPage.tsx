import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Issue } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const SEVERITY_COLOR = { low: 'bg-blue-100 text-blue-700', medium: 'bg-orange-100 text-orange-700', high: 'bg-red-100 text-red-700', urgent: 'bg-red-600 text-white' }
const STATUS_COLOR: Record<string, string> = { open: 'bg-orange-100 text-orange-700', in_progress: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600' }

export default function AdminIssuesPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['admin', 'issues'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.ISSUES)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Issue)
    },
    staleTime: 3 * 60 * 1000,
  })

  const filtered = issues.filter(i => {
    const matchSearch = !search || i.description.toLowerCase().includes(search.toLowerCase()) || i.userName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || i.status === filterStatus
    const matchSeverity = filterSeverity === 'all' || i.severity === filterSeverity
    return matchSearch && matchStatus && matchSeverity
  })

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, COLLECTIONS.ISSUES, id), { status, resolvedBy: profile?.displayName, resolvedAt: serverTimestamp(), updatedAt: serverTimestamp() })
    toast.success('Issue updated')
    qc.invalidateQueries({ queryKey: ['admin', 'issues'] })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-accent">Admin · Issues</p>
        <h1 className="text-2xl font-display font-bold mt-1">Issue Tracker</h1>
        <p className="text-muted-foreground text-sm">{issues.length} total · {issues.filter(i=>i.status==='open').length} open · Latest to oldest.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search issues…" className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          {['open','investigating','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All severities</option>
          {['low','medium','high','urgent'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reported by</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i, idx) => (
                  <TableRow key={i.id}>
                    <TableCell>{filtered.length - idx}</TableCell>
                    <TableCell>{i.type.replace('_',' ')}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLOR[i.severity]}`}>{i.severity}</span></TableCell>
                    <TableCell>{i.relatedMachine || '—'}</TableCell>
                    <TableCell>{i.description}</TableCell>
                    <TableCell>
                      <div className="text-sm">{i.userName}</div>
                      <div className="text-xs text-muted-foreground">{i.userEmail}</div>
                    </TableCell>
                    <TableCell>{formatDateTime(i.createdAt)}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[i.status]}`}>{i.status}</span></TableCell>
                    <TableCell>
                      <select value={i.status} onChange={e => updateStatus(i.id, e.target.value)} className="text-xs border rounded px-1.5 py-0.5 outline-none">
                        {['open','investigating','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t">
              {filtered.length} of {issues.length} issues · Latest first · Urgent rows highlighted
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

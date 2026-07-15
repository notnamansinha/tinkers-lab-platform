import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Search, FolderKanban, CheckCircle, XCircle } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Project } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { DataPanel } from '@/components/common/DataPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-orange text-white',
  active: 'bg-lime text-white',
  completed: 'bg-indigo text-white',
  on_hold: 'bg-white/40 border border-white/20 shadow-sm text-white',
  rejected: 'bg-pink text-white',
}

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
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Projects"
        description={`${projects.length} total · Approve or reject project submissions.`}
        action={
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <FolderKanban size={22} className="text-lime" />
          </div>
        }
        filters={
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative w-full lg:w-80 flex-shrink-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D9FC2]" />
              <input type="text" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} className="tl-input pl-11 w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All statuses" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} tone="dark" />
              {['pending', 'active', 'completed', 'on_hold', 'rejected'].map(s => (
                <FilterChip key={s} label={s.replace('_', ' ')} active={filterStatus === s} onClick={() => setFilterStatus(s)} tone="dark" />
              ))}
            </div>
          </div>
        }
      />

      <DataPanel title="All Projects" description={`${filtered.length} of ${projects.length} · Latest first`}>
        <Table className="">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-0">
              <TableHead>#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="h-32 text-center text-[#7D9FC2]">Loading…</TableCell></TableRow>
            ) : filtered.map((p, idx) => (
              <TableRow key={p.id} className={cn('border-0', p.status === 'pending' && 'bg-orange/5')}>
                <TableCell className="text-[#7D9FC2] font-mono text-xs">{filtered.length - idx}</TableCell>
                <TableCell className="font-semibold text-[#56779D]">{p.title}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-[#56779D]">{p.userName}</div>
                  <div className="text-xs text-white/45">{p.userEmail}</div>
                </TableCell>
                <TableCell className="text-[#7D9FC2] text-xs uppercase">{p.userType}</TableCell>
                <TableCell className="text-[#7D9FC2] text-sm">{p.department}</TableCell>
                <TableCell className="text-[#7D9FC2] text-sm">{p.startDate}</TableCell>
                <TableCell className="text-[#7D9FC2] text-sm">{formatDateTime(p.createdAt)}</TableCell>
                <TableCell><span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', STATUS_COLOR[p.status] || 'bg-white/40 border border-white/20 shadow-sm text-white')}>{p.status}</span></TableCell>
                <TableCell className="text-right">
                  {p.status === 'pending' ? (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => updateStatus(p.id, 'active')} className="p-2 rounded-full hover:bg-lime/20 text-lime transition-colors" aria-label="Approve"><CheckCircle size={16} /></button>
                      <button onClick={() => { const r = window.prompt('Rejection reason:') || ''; updateStatus(p.id, 'rejected', r) }} className="p-2 rounded-full hover:bg-pink/20 text-pink transition-colors" aria-label="Reject"><XCircle size={16} /></button>
                    </div>
                  ) : <span className="text-white/30 text-xs">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>
    </div>
  )
}

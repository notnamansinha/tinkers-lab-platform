import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Search, AlertTriangle } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Issue } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { DataPanel } from '@/components/common/DataPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const SEVERITY_COLOR: Record<string, string> = {
  low: 'bg-indigo text-white',
  medium: 'bg-orange text-white',
  high: 'bg-pink text-white',
  urgent: 'bg-pink text-white',
}
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-orange text-white',
  investigating: 'bg-white/40 border border-white/20 shadow-sm text-white',
  in_progress: 'bg-white/40 border border-white/20 shadow-sm text-white',
  resolved: 'bg-lime text-white',
  closed: 'bg-[rgba(0,0,0,0.4)] text-white',
}

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
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Issues"
        description={`${issues.length} total · ${issues.filter(i => i.status === 'open').length} open · Track and resolve lab issues.`}
        action={
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <AlertTriangle size={22} className="text-pink" />
          </div>
        }
        filters={
          <div className="flex flex-col gap-4">
            <div className="relative w-full lg:w-80">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D9FC2]" />
              <input type="text" placeholder="Search issues…" value={search} onChange={e => setSearch(e.target.value)} className="tl-input pl-11 w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All statuses" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
              {['open', 'investigating', 'resolved', 'closed'].map(s => (
                <FilterChip key={s} label={s} active={filterStatus === s} onClick={() => setFilterStatus(s)} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              <FilterChip label="All severities" active={filterSeverity === 'all'} onClick={() => setFilterSeverity('all')} />
              {['low', 'medium', 'high', 'urgent'].map(s => (
                <FilterChip key={s} label={s} active={filterSeverity === s} onClick={() => setFilterSeverity(s)} />
              ))}
            </div>
          </div>
        }
      />

      <DataPanel title="Issue Tracker" description={`${filtered.length} of ${issues.length} · Latest first`}>
        <Table className="">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-0">
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
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="h-32 text-center text-[#7D9FC2]">Loading…</TableCell></TableRow>
            ) : filtered.map((i, idx) => (
              <TableRow key={i.id} className={cn('border-0', i.severity === 'urgent' && 'bg-pink/5')}>
                <TableCell className="text-[#7D9FC2] font-mono text-xs">{filtered.length - idx}</TableCell>
                <TableCell className="text-[#7D9FC2] text-xs uppercase">{i.type.replace('_', ' ')}</TableCell>
                <TableCell><span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', SEVERITY_COLOR[i.severity])}>{i.severity}</span></TableCell>
                <TableCell className="text-white/70 text-sm">{i.relatedMachine || '—'}</TableCell>
                <TableCell className="text-white max-w-[200px] truncate">{i.description}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-[#56779D]">{i.userName}</div>
                  <div className="text-xs text-white/45">{i.userEmail}</div>
                </TableCell>
                <TableCell className="text-[#7D9FC2] text-sm">{formatDateTime(i.createdAt)}</TableCell>
                <TableCell><span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', STATUS_COLOR[i.status])}>{i.status}</span></TableCell>
                <TableCell>
                  <select value={i.status} onChange={e => updateStatus(i.id, e.target.value)} className="text-xs border border-white/10 rounded-full px-3 py-1 outline-none bg-white/50 font-medium">
                    {['open', 'investigating', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>
    </div>
  )
}

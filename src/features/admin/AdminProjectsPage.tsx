import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { updateProjectStatus } from '@/services/firebase/projects'
import { Search, FolderKanban, CheckCircle, XCircle } from 'lucide-react'
import { formatDateTime, cn, cleanFirestoreData, debugLog } from '@/lib/utils'
import { toast } from 'sonner'
import type { Project } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { DataPanel } from '@/components/common/DataPanel'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-orange text-white',
  active: 'bg-lime text-white',
  completed: 'bg-indigo text-white',
  on_hold: 'bg-white/40 border border-white/20 shadow-sm text-white',
  rejected: 'bg-pink text-white',
}

type ExtendedProject = Project & { docId: string; firestoreDocId?: string }

export default function AdminProjectsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [rejectProject, setRejectProject] = useState<ExtendedProject | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin', 'projects_v2'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.PROJECTS)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => {
        const data = d.data()
        return {
          ...data,
          docId: d.id,
          firestoreDocId: d.id,
        } as ExtendedProject
      })
    },
    staleTime: 0,
    refetchOnMount: true,
  })

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.userName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const updateStatus = async (projectItem: ExtendedProject, status: string, reason?: string) => {
    setActionLoading(true)
    let targetDocId = projectItem.docId || projectItem.firestoreDocId || (projectItem as any)._id

    // Fallback: If docId is missing, query by the sequential project code (e.g. "TL-001")
    if (!targetDocId) {
      try {
        const ref = collection(db, COLLECTIONS.PROJECTS)
        const q = query(ref, where('projectCode', '==', projectItem.projectCode))
        const snap = await getDocs(q)
        if (!snap.empty) {
          targetDocId = snap.docs[0].id
        }
      } catch (err) {
        console.warn('Fallback docId lookup error:', err)
      }
    }

    if (!targetDocId) {
      toast.error('Cannot update project: Missing document ID.')
      setActionLoading(false)
      return
    }

    try {
      await updateProjectStatus(
        targetDocId,
        status as 'active' | 'rejected' | 'on_hold' | 'completed',
        reason,
        { uid: profile?.uid ?? 'admin', name: profile?.displayName || 'Admin', email: profile?.email || '' }
      )
      // Keep reviewedBy/reviewedAt audit metadata (not part of the core Project type)
      await updateDoc(doc(db, COLLECTIONS.PROJECTS, targetDocId), cleanFirestoreData({
        reviewedBy: profile?.displayName || 'Admin',
        reviewedByEmail: profile?.email || '',
        reviewedAt: serverTimestamp(),
      }))
      toast.success(`Project marked as ${status}`)
      qc.invalidateQueries({ queryKey: ['admin', 'projects_v2'] })
    } catch (error: unknown) {
      const firebaseErr = error as { code?: string; message?: string }
      debugLog('Error updating project status:', error)
      if (firebaseErr.code === 'permission-denied' || firebaseErr.message?.includes('permission')) {
        toast.error('Permission denied: Your account document in Firestore has role="student". Please set role="super_admin" in Firebase Console -> Firestore -> users.')
      } else {
        toast.error(`Failed to update project: ${firebaseErr.message || 'Permission denied'}`)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectProject) return
    await updateStatus(rejectProject, 'rejected', rejectionReason)
    setRejectProject(null)
    setRejectionReason('')
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] min-w-0 animate-fade-in">
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
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input type="text" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} className="tl-input pl-11 w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All statuses" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
              {['pending', 'active', 'completed', 'on_hold', 'rejected'].map(s => (
                <FilterChip key={s} label={s.replace('_', ' ')} active={filterStatus === s} onClick={() => setFilterStatus(s)} />
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
               <TableHead className="hidden lg:table-cell">Type</TableHead>
               <TableHead className="hidden lg:table-cell">Department</TableHead>
               <TableHead className="hidden sm:table-cell">Start</TableHead>
               <TableHead className="hidden xl:table-cell">Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center text-white/50">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-24 text-center text-white/50">No projects found.</TableCell></TableRow>
            ) : filtered.map((p, idx) => (
              <TableRow key={p.docId || p.projectCode || idx} className={cn('border-0', p.status === 'pending' && 'bg-orange/5')}>
                <TableCell className="font-mono text-xs text-white/50">{filtered.length - idx}</TableCell>
                <TableCell className="font-semibold text-white">
                  <button
                    onClick={() => navigate(`/admin/projects/${p.docId || p.firestoreDocId}`)}
                    className="text-left hover:underline underline-offset-2 transition-colors"
                    title="View project details & logs"
                  >
                    <div>{p.title}</div>
                    <div className="font-mono text-xs text-white/50">{p.projectCode}</div>
                  </button>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-white">{p.userName}</div>
                  <div className="text-xs text-white/45">{p.userEmail}</div>
                </TableCell>
                 <TableCell className="hidden text-xs uppercase text-white/50 lg:table-cell">{p.userType}</TableCell>
                 <TableCell className="hidden text-sm text-white/50 lg:table-cell">{p.department || '—'}</TableCell>
                 <TableCell className="hidden text-sm text-white/50 sm:table-cell">{p.startDate}</TableCell>
                 <TableCell className="hidden text-sm text-white/50 xl:table-cell">{formatDateTime(p.createdAt)}</TableCell>
                <TableCell>
                  <span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', STATUS_COLOR[p.status] || 'bg-white/40 border border-white/20 shadow-sm text-white')}>
                    {p.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end items-center">
                    <button
                      onClick={() => { updateStatus(p, 'active') }}
                      className={cn(
                        'p-2 rounded-full transition-colors',
                        p.status === 'active' ? 'bg-lime text-black font-bold' : 'hover:bg-lime/20 text-lime'
                      )}
                      title="Approve Project"
                      aria-label="Approve"
                      disabled={actionLoading}
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => { setRejectProject(p); setRejectionReason('') }}
                      className={cn(
                        'p-2 rounded-full transition-colors',
                        p.status === 'rejected' ? 'bg-pink text-white font-bold' : 'hover:bg-pink/20 text-pink'
                      )}
                      title="Reject Project"
                      aria-label="Reject"
                      disabled={actionLoading}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>

      <ConfirmDialog
        open={rejectProject !== null}
        onOpenChange={(open) => { if (!open) setRejectProject(null) }}
        title="Reject Project"
        description="Optionally provide a reason for rejection."
        onConfirm={handleReject}
        confirmLabel="Reject"
        variant="destructive"
        loading={actionLoading}
      >
        <Input
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Rejection reason (optional)"
          className="tl-input w-full"
        />
      </ConfirmDialog>
    </div>
  )
}

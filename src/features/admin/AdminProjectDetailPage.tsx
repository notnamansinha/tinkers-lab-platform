import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { getProjectActivity } from '@/services/firebase/activityLog'
import { getProjectMembers } from '@/services/firebase/projectMembers'
import { getProjectBookings } from '@/services/firebase/bookings'
import { getProjectCheckouts } from '@/services/firebase/toolCheckouts'
import { updateProjectStatus } from '@/services/firebase/projects'
import {
  Calendar, Clock, User, Mail, Phone, Building, IdCard,
  Link2, GraduationCap, CheckCircle, XCircle, PauseCircle, Flag,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Project, ActivityLogEntry, ProjectMember, Booking, ToolCheckout } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { DataPanel } from '@/components/common/DataPanel'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatRelativeTime, cn, cleanFirestoreData } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_STYLE: Record<string, string> = {
  pending:   'border-orange/30 bg-orange/10 text-orange',
  active:    'border-lime/30 bg-lime/10 text-lime',
  completed: 'border-indigo/30 bg-indigo/10 text-indigo',
  on_hold:   'border-orange/30 bg-orange/10 text-orange',
  rejected:  'border-pink/30 bg-pink/10 text-pink',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', active: 'Active', completed: 'Completed', on_hold: 'On Hold', rejected: 'Rejected',
}

const BOOKING_STATUS_STYLE: Record<string, string> = {
  approved: 'border-lime/30 bg-lime/10 text-lime',
  completed: 'border-indigo/30 bg-indigo/10 text-indigo',
  cancelled: 'border-white/15 bg-white/5 text-white/50',
  rejected: 'border-pink/30 bg-pink/10 text-pink',
}

const LOG_TYPE_STYLE: Record<string, string> = {
  created: 'bg-lime',
  booking: 'bg-indigo',
  checkout: 'bg-orange',
  return: 'bg-pink',
  status_change: 'bg-white/40',
}

function DetailRow({ label, value, icon: Icon, href }: { label: string; value?: string; icon?: React.ComponentType<{ className?: string }>; href?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-semibold text-lime hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-sm font-semibold text-white">{value}</p>
        )}
      </div>
    </div>
  )
}

export default function AdminProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const qc = useQueryClient()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const { data: project, isLoading } = useQuery({
    queryKey: ['admin', 'projects', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.PROJECTS, id!))
      if (!snap.exists()) return null
      return { docId: snap.id, ...snap.data() } as Project & { docId: string }
    },
    enabled: !!id,
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['admin', 'projects', id, 'activity'],
    queryFn: () => getProjectActivity(id!),
    enabled: !!id,
  })

  const { data: roster = [] } = useQuery({
    queryKey: ['admin', 'projects', id, 'members'],
    queryFn: () => getProjectMembers(id!),
    enabled: !!id,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['admin', 'projects', id, 'bookings'],
    queryFn: () => getProjectBookings(id!),
    enabled: !!id,
  })

  const { data: checkouts = [] } = useQuery({
    queryKey: ['admin', 'projects', id, 'checkouts'],
    queryFn: () => getProjectCheckouts(id!),
    enabled: !!id,
  })

  const imageUrls = project?.imageUrls ?? []
  const documentUrls = project?.documentUrls ?? []

  const updateStatus = async (status: 'active' | 'rejected' | 'on_hold' | 'completed', reason?: string) => {
    if (!project?.docId) return
    setActionLoading(true)
    try {
      await updateProjectStatus(project.docId, status, reason, {
        uid: profile?.uid ?? 'admin',
        name: profile?.displayName || 'Admin',
        email: profile?.email || '',
      })
        await updateDoc(doc(db, COLLECTIONS.PROJECTS, project.docId), cleanFirestoreData({
          reviewedBy: profile?.displayName || 'Admin',
          reviewedByEmail: profile?.email || '',
          reviewedAt: serverTimestamp(),
      }))
      toast.success(`Project marked as ${status}`)
      qc.invalidateQueries({ queryKey: ['admin', 'projects', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'projects_v2'] })
    } catch (error) {
      const firebaseErr = error as { code?: string; message?: string }
      toast.error(firebaseErr.message || 'Failed to update project status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    await updateStatus('rejected', rejectionReason.trim() || undefined)
    setRejectOpen(false)
    setRejectionReason('')
  }

  if (isLoading) return <LoadingSpinner text="Loading project…" fullScreen />
  if (!project) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-white/50">Project not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/projects')}>Back to projects</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] min-w-0 animate-fade-in space-y-5">
      <PageHeader
        variant="dark"
        title={project.title}
        description={`${project.projectCode} · Submitted by ${project.userName}`}
        action={
          <span className={cn('rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-wider', STATUS_STYLE[project.status] || 'border-white/20 bg-white/5 text-white')}>
            {STATUS_LABEL[project.status] || project.status}
          </span>
        }
      />

      {/* ── Admin actions ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={actionLoading || project.status === 'active'}
          onClick={() => updateStatus('active')}
          className="gap-2 rounded-full border-lime/40 bg-lime/10 text-lime hover:bg-lime/20"
        >
          <CheckCircle className="h-4 w-4" /> Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionLoading}
          onClick={() => { setRejectionReason(''); setRejectOpen(true) }}
          className="gap-2 rounded-full border-pink/40 bg-pink/10 text-pink hover:bg-pink/20"
        >
          <XCircle className="h-4 w-4" /> Reject
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionLoading || project.status === 'on_hold'}
          onClick={() => updateStatus('on_hold')}
          className="gap-2 rounded-full border-orange/40 bg-orange/10 text-orange hover:bg-orange/20"
        >
          <PauseCircle className="h-4 w-4" /> Hold
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionLoading || project.status === 'completed'}
          onClick={() => updateStatus('completed')}
          className="gap-2 rounded-full border-indigo/40 bg-indigo/10 text-indigo hover:bg-indigo/20"
        >
          <Flag className="h-4 w-4" /> Complete
        </Button>
        {project.reviewedBy && (
          <span className="ml-auto text-xs text-white/35">
            Reviewed by {project.reviewedBy}{project.reviewedByEmail ? ` (${project.reviewedByEmail})` : ''} · {formatDateTime(project.reviewedAt)}
          </span>
        )}
      </div>

      {project.rejectionReason && (
        <div className="rounded-md border border-pink/30 bg-pink/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-pink">Rejection reason</p>
          <p className="mt-1 text-sm text-pink/80">{project.rejectionReason}</p>
        </div>
      )}

      {/* ── Project info ──────────────────────────────────────────── */}
      <DataPanel title="Project Details">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Owner" value={project.userName} icon={User} />
          <DetailRow label="Email" value={project.userEmail} icon={Mail} />
          <DetailRow label="Contact" value={project.contact} icon={Phone} />
          <DetailRow label="User type" value={project.userType} icon={IdCard} />
          <DetailRow label="Department" value={project.department} icon={Building} />
          <DetailRow label="Start date" value={project.startDate} icon={Calendar} />
          <DetailRow label="End date" value={project.endDate} icon={Calendar} />
          <DetailRow label="Submitted" value={formatDateTime(project.createdAt)} icon={Clock} />
          <DetailRow label="Resource link" value={project.resourceLink} icon={Link2} href={project.resourceLink} />
        </div>
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Abstract</p>
          <p className="mt-1 text-sm leading-relaxed text-white/75">{project.abstract}</p>
        </div>
        {project.expectedEquipmentNeeds?.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Expected equipment needs</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {project.expectedEquipmentNeeds.map((need) => (
                <span key={need} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                  {need}
                </span>
              ))}
              {project.equipmentNeedsOther && (
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">{project.equipmentNeedsOther}</span>
              )}
            </div>
          </div>
        )}
      </DataPanel>

      {/* ── Files ─────────────────────────────────────────────────── */}
      {(imageUrls.length > 0 || documentUrls.length > 0) && (
        <DataPanel title="Files">
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {imageUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-md border border-white/10">
                  <img src={url} alt="Project" className="aspect-video w-full object-cover transition-transform group-hover:scale-105" />
                </a>
              ))}
            </div>
          )}
          {documentUrls.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {documentUrls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-indigo-300 underline-offset-2 hover:underline">
                    <FileText className="h-4 w-4" /> {decodeURIComponent(url.split('/').pop() ?? url)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Team Roster ─────────────────────────────────────────── */}
        <DataPanel title="Team Roster" description={`${roster.length} member(s)`}>
          {roster.length === 0 ? (
            <p className="text-sm text-white/40">No team members recorded.</p>
          ) : (
            <ul className="space-y-2">
              {roster.map((member: ProjectMember) => (
                <li key={member.id} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo/20 text-white/60">
                    {member.isMentor ? <GraduationCap className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white/85">{member.name}</p>
                    <p className="text-[11px] text-white/40">
                      {member.isMentor ? 'Faculty mentor' : 'Team member'}{member.universityId ? ` · ${member.universityId}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataPanel>

        {/* ── Activity Log (the unified timeline) ─────────────────── */}
        <DataPanel title="Activity Log" description={`${activity.length} entries · everything that happened on this project`}>
          {activity.length === 0 ? (
            <p className="text-sm text-white/40">No activity yet.</p>
          ) : (
            <ol className="relative max-h-[420px] space-y-4 overflow-y-auto border-l border-white/10 pl-5 pr-1">
              {activity.map((entry: ActivityLogEntry) => (
                <li key={entry.id} className="relative">
                  <span className={cn('absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full', LOG_TYPE_STYLE[entry.type] || 'bg-white/40')} />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/50">{entry.type.replace('_', ' ')}</p>
                    <span className="shrink-0 text-[10px] text-white/30">{formatRelativeTime(entry.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-white/85">{entry.summary}</p>
                  <p className="text-[11px] text-white/40">{entry.userName} · {entry.userEmail}</p>
                </li>
              ))}
            </ol>
          )}
        </DataPanel>
      </div>

      {/* ── Bookings under this project ───────────────────────────── */}
      <DataPanel title="Bookings" description={`${bookings.length} Tier-1 machine booking(s)`}>
        {bookings.length === 0 ? (
          <p className="text-sm text-white/40">No bookings for this project.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                  <th className="px-3 py-2">Machine</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: Booking) => (
                  <tr key={b.id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-semibold text-white/85">{b.machineName || b.machineId}</td>
                    <td className="px-3 py-2 text-white/60">{b.date}</td>
                    <td className="px-3 py-2 font-mono text-xs text-white/60">{b.startTime}–{b.endTime}</td>
                    <td className="px-3 py-2 text-white/60">{b.purpose}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase', BOOKING_STATUS_STYLE[b.status] || 'border-white/15 bg-white/5 text-white/50')}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {/* ── Checkouts under this project ──────────────────────────── */}
      <DataPanel title="Tool Checkouts" description={`${checkouts.length} Tier-2 tool borrow/return record(s)`}>
        {checkouts.length === 0 ? (
          <p className="text-sm text-white/40">No tool checkouts for this project.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                  <th className="px-3 py-2">Tool</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Returned</th>
                  <th className="px-3 py-2">Condition</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {checkouts.map((c: ToolCheckout) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="px-3 py-2 font-semibold text-white/85">{c.toolName}</td>
                    <td className="px-3 py-2 text-white/60">{c.toolCategory}</td>
                    <td className="px-3 py-2 text-white/60">{c.quantity}</td>
                    <td className="px-3 py-2 text-white/60">
                      {c.locationOfUse === 'taking_outside' ? (c.outsideLocation || 'Outside') : 'In lab'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-white/60">{c.expectedReturnDate}</td>
                    <td className="px-3 py-2 text-white/60">{c.returnedAt ? formatDateTime(c.returnedAt) : '—'}</td>
                    <td className="px-3 py-2 text-white/60">{c.conditionAtReturn || c.conditionAtCheckout}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase', c.isOverdue ? 'border-pink/40 bg-pink/10 text-pink' : 'border-white/15 bg-white/5 text-white/60')}>
                        {c.isOverdue ? 'Overdue' : c.action === 'returning' ? 'Returned' : 'Checked out'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Project"
        description="Optionally provide a reason for rejection — the owner will be notified."
        onConfirm={handleReject}
        confirmLabel="Reject"
        variant="destructive"
        loading={actionLoading}
      >
        <input
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Rejection reason (optional)"
          className="tl-input w-full"
        />
      </ConfirmDialog>
    </div>
  )
}

import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ArrowLeft, Edit, Calendar, Clock, User, Mail, Phone, Building, IdCard, Users, Link2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Project } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

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

function DetailRow({ label, value, icon: Icon, href }: { label: string; value?: string; icon?: React.ComponentType<{ className?: string }>; href?: string }) {
  if (!value) return null
  const displayValue = typeof value === 'string' ? value : String(value)
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-lime hover:underline break-all">
            {displayValue}
          </a>
        ) : (
          <p className="text-sm font-semibold text-white">{displayValue}</p>
        )}
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, user } = useAuth()
  const { data: project, isLoading } = useQuery({ queryKey: ['projects', id], queryFn: async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.PROJECTS, id!))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as Project
    }, enabled: !!id })

  if (isLoading) return <LoadingSpinner text="Loading…" />
  if (!project) return <div className="py-16 text-center text-white/50">Project not found. <Link to="/projects" className="text-indigo hover:underline">← Back</Link></div>

  const canEdit = isAdmin || project.userId === user?.uid

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-near-black text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">{project.userType}</p>
          <h1 className="truncate text-xl font-extrabold text-white">{project.title}</h1>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${STATUS_STYLE[project.status] || 'border-white/20 bg-white/5 text-white/50'}`}>
          {STATUS_LABEL[project.status] || project.status}
        </span>
        {canEdit && (
          <Link
            to={`/projects/${id}/edit`}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-pink px-4 py-1.5 text-xs font-bold text-black transition-all hover:brightness-110"
          >
            <Edit size={13} /> Edit
          </Link>
        )}
      </div>

      {/* Abstract */}
      <div className="rounded-card border border-hairline bg-charcoal p-6">
        <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-white/40">Abstract</h2>
        <p className="text-sm leading-relaxed text-white/80">{project.abstract}</p>
      </div>

      {/* Details */}
      <div className="rounded-card border border-hairline bg-charcoal p-6">
        <h2 className="mb-5 text-xs font-black uppercase tracking-widest text-white/40">Details</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DetailRow icon={User} label="Registered by" value={project.userName} />
          <DetailRow icon={Mail} label="Email" value={project.userEmail} />
          <DetailRow icon={Phone} label="Contact" value={project.contact} />
          <DetailRow icon={Building} label="Department" value={project.department} />
          <DetailRow icon={IdCard} label="University ID" value={project.universityId} />
          <DetailRow icon={Users} label="Team members" value={typeof project.teamMembers === 'string' ? project.teamMembers : ''} />
          <DetailRow icon={Users} label="Faculty mentor" value={project.facultyMentor} />
          <DetailRow icon={Calendar} label="Start date" value={project.startDate} />
          <DetailRow icon={Clock} label="End date" value={project.endDate} />
          <DetailRow icon={Link2} label="Resource link" value={project.resourceLink} href={project.resourceLink && /^https?:\/\//i.test(project.resourceLink) ? project.resourceLink : undefined} />
        </div>

        {project.rejectionReason && (
          <div className="mt-5 rounded-md border border-pink/30 bg-pink/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-pink">Rejection reason</p>
            <p className="mt-1 text-sm text-pink/80">{project.rejectionReason}</p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-white/20 pb-2">
        Project ID: {project.id}
      </p>
    </div>
  )
}

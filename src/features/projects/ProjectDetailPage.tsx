import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { ArrowLeft, Edit } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Project } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const STATUS_COLOR = { pending: 'bg-orange-100 text-orange-700', active: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700', on_hold: 'bg-yellow-100 text-yellow-700', rejected: 'bg-red-100 text-red-700' }

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, user } = useAuth()
  const { data: project, isLoading } = useQuery({ queryKey: ['projects', id], queryFn: () => getDocument<Project>(COLLECTIONS.PROJECTS, id!), enabled: !!id })

  if (isLoading) return <LoadingSpinner text="Loading…" />
  if (!project) return <div className="py-16 text-center text-muted-foreground">Not found. <Link to="/projects" className="text-primary hover:underline">← Back</Link></div>

  const canEdit = isAdmin || project.userId === user?.uid

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <p className="text-xs font-mono text-muted-foreground">{project.id} · {project.userType}</p>
          <h1 className="text-xl font-display font-bold">{project.title}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[project.status] || 'bg-gray-100'}`}>{project.status}</span>
        {canEdit && <Link to={`/projects/${id}/edit`} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-muted"><Edit size={14}/> Edit</Link>}
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Abstract</h2>
        <p className="text-sm leading-relaxed">{project.abstract}</p>
      </div>

      <div className="rounded-lg border bg-card p-5 grid grid-cols-2 gap-3">
        <h2 className="col-span-full font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Details</h2>
        {[['Registered by', project.userName], ['Email', project.userEmail], ['Contact', project.contact], ['Department', project.department], ['Student ID', project.studentId || '—'], ['User Type', project.userType], ['Team Members', project.teamMembers || '—'], ['Faculty Mentor', project.facultyMentor || '—'], ['Start Date', project.startDate], ['End Date', project.endDate || '—'], ['Resource Link', project.resourceLink || '—']].map(([k,v]) => (
          <div key={k}><p className="text-xs text-muted-foreground font-mono">{k}</p><p className="text-sm font-medium mt-0.5">{String(v)}</p></div>
        ))}
        {project.rejectionReason && <div className="col-span-2"><p className="text-xs text-destructive font-mono">Rejection Reason</p><p className="text-sm text-destructive">{project.rejectionReason}</p></div>}
      </div>
    </div>
  )
}

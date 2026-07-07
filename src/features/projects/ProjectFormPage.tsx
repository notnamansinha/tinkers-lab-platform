import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocument, addDocument, updateDocument, getDocumentsWhere, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Project } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  abstract: z.string().min(50, 'Abstract must be at least 50 characters'),
  contact: z.string().min(5, 'Contact required'),
  department: z.string().min(1, 'Department required'),
  studentId: z.string().optional(),
  teamMembers: z.string().optional(),
  facultyMentor: z.string().optional(),
  userType: z.enum(['Student', 'Faculty', 'Lab Staff', 'Venture Studio', 'External Visitor']),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().optional(),
  resourceLink: z.string().url().optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function ProjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user, profile, isAdmin } = useAuth()
  const qc = useQueryClient()

  const { data: existing, isLoading } = useQuery({ queryKey: ['projects', id], queryFn: () => getDocument<Project>(COLLECTIONS.PROJECTS, id!), enabled: isEdit })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: { userType: 'Student', startDate: todayStr() },
  })

  React.useEffect(() => {
    if (existing) {
      reset({
        title: existing.title, abstract: existing.abstract, contact: existing.contact,
        department: existing.department, studentId: existing.studentId,
        teamMembers: existing.teamMembers, facultyMentor: existing.facultyMentor,
        userType: existing.userType as FormData['userType'],
        startDate: existing.startDate, endDate: existing.endDate, resourceLink: existing.resourceLink,
      })
    }
  }, [existing, reset])

  const onSubmit = async (data: FormData) => {
    if (!user || !profile) { toast.error('Sign in required'); return }
    try {
      if (isEdit) {
        await updateDocument(COLLECTIONS.PROJECTS, id!, { ...data, imageUrls: existing?.imageUrls ?? [], documentUrls: existing?.documentUrls ?? [] })
        toast.success('Project updated')
        navigate(`/projects/${id}`)
      } else {
        // Generate project ID
        const ref = collection(db, COLLECTIONS.PROJECTS)
        const snap = await getCountFromServer(ref)
        const projectId = `TL-${String(snap.data().count + 1).padStart(3,'0')}`
        const docId = await addDocument<Project>(COLLECTIONS.PROJECTS, {
          ...data, id: projectId,
          userId: user.uid, userEmail: user.email!, userName: profile.displayName,
          status: 'pending', imageUrls: [], documentUrls: [],
        } as Omit<Project,'id'|'createdAt'|'updatedAt'>)
        toast.success('Project registered! Pending review.')
        navigate(`/projects/${docId}`)
      }
      qc.invalidateQueries({ queryKey: ['projects'] })
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed') }
  }

  if (isLoading) return <LoadingSpinner text="Loading…" />
  const inp = (e: boolean) => cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', e && 'border-destructive')

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-display font-bold">{isEdit ? 'Edit Project' : 'Register Project'}</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-lg border bg-card p-5 grid grid-cols-2 gap-4">
          <h2 className="col-span-full font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Project Info</h2>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Project Title * <span className="text-xs text-muted-foreground">(min 5 chars)</span></label>
            <input className={inp(!!errors.title)} {...register('title')} />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Abstract * <span className="text-xs text-muted-foreground">(min 50 chars)</span></label>
            <textarea rows={4} placeholder="Describe your project, its goals, and methods…" className={cn(inp(!!errors.abstract),'resize-none')} {...register('abstract')} />{errors.abstract && <p className="text-xs text-destructive">{errors.abstract.message}</p>}</div>
          <div className="space-y-1"><label className="text-sm font-medium">I am a *</label>
            <select className={inp(false)} {...register('userType')}>{['Student','Faculty','Lab Staff','Venture Studio','External Visitor'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="space-y-1"><label className="text-sm font-medium">Department *</label><input className={inp(!!errors.department)} {...register('department')} />{errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}</div>
          <div className="space-y-1"><label className="text-sm font-medium">Contact * <span className="text-xs text-muted-foreground">(phone/email)</span></label><input className={inp(!!errors.contact)} {...register('contact')} />{errors.contact && <p className="text-xs text-destructive">{errors.contact.message}</p>}</div>
          <div className="space-y-1"><label className="text-sm font-medium">Student ID</label><input placeholder="AU2440123" className={inp(false)} {...register('studentId')} /></div>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Team Members <span className="text-xs text-muted-foreground">(comma separated)</span></label>
            <input placeholder="Name 1, Name 2…" className={inp(false)} {...register('teamMembers')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Faculty Mentor</label><input className={inp(false)} {...register('facultyMentor')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Start Date *</label><input type="date" className={inp(!!errors.startDate)} {...register('startDate')} /></div>
          <div className="space-y-1"><label className="text-sm font-medium">Expected End Date</label><input type="date" className={inp(false)} {...register('endDate')} /></div>
          <div className="col-span-full space-y-1"><label className="text-sm font-medium">Resource Link <span className="text-xs text-muted-foreground">(GitHub, Drive, etc.)</span></label>
            <input type="url" placeholder="https://…" className={inp(false)} {...register('resourceLink')} /></div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" /> : <Save size={16} />}
            {isEdit ? 'Save changes' : 'Submit for review'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  )
}

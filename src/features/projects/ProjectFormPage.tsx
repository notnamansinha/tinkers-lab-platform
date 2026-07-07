import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocument, addDocument, updateDocument, getDocumentsWhere, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import { collection, getCountFromServer } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Project } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
  const { user, profile } = useAuth()
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

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Project' : 'Register Project'}</h1>
          <p className="text-muted-foreground mt-1">Provide the details for your lab project.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>Basic details about the project and team.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="col-span-full space-y-2">
              <Label>Project Title <span className="text-destructive">*</span></Label>
              <Input {...register('title')} placeholder="Enter project title" className={errors.title ? 'border-destructive' : ''} />
              {errors.title && <p className="text-[0.8rem] text-destructive">{errors.title.message}</p>}
            </div>

            <div className="col-span-full space-y-2">
              <Label>Abstract <span className="text-destructive">*</span></Label>
              <Textarea 
                {...register('abstract')} 
                rows={4} 
                placeholder="Describe your project, its goals, and methods..." 
                className={cn('resize-none', errors.abstract ? 'border-destructive' : '')} 
              />
              {errors.abstract && <p className="text-[0.8rem] text-destructive">{errors.abstract.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>I am a <span className="text-destructive">*</span></Label>
              <select 
                {...register('userType')} 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {['Student','Faculty','Lab Staff','Venture Studio','External Visitor'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Department <span className="text-destructive">*</span></Label>
              <Input {...register('department')} placeholder="e.g. Computer Science" className={errors.department ? 'border-destructive' : ''} />
              {errors.department && <p className="text-[0.8rem] text-destructive">{errors.department.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Contact <span className="text-destructive">*</span></Label>
              <Input {...register('contact')} placeholder="Phone or email" className={errors.contact ? 'border-destructive' : ''} />
              {errors.contact && <p className="text-[0.8rem] text-destructive">{errors.contact.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Student ID</Label>
              <Input {...register('studentId')} placeholder="Optional" />
            </div>

            <div className="col-span-full space-y-2">
              <Label>Team Members</Label>
              <Input {...register('teamMembers')} placeholder="Comma separated names" />
            </div>

            <div className="space-y-2">
              <Label>Faculty Mentor</Label>
              <Input {...register('facultyMentor')} placeholder="Name of mentor (if any)" />
            </div>

            <div className="space-y-2">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <Input type="date" {...register('startDate')} className={errors.startDate ? 'border-destructive' : ''} />
              {errors.startDate && <p className="text-[0.8rem] text-destructive">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Expected End Date</Label>
              <Input type="date" {...register('endDate')} />
            </div>

            <div className="col-span-full space-y-2">
              <Label>Resource Link</Label>
              <Input type="url" {...register('resourceLink')} placeholder="https://github.com/..." />
            </div>

          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Submit for review'}
          </Button>
        </div>
      </form>
    </div>
  )
}

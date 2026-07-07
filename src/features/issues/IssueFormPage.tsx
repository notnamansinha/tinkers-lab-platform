import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Issue } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const schema = z.object({
  type: z.enum(['machine_malfunction','safety_concern','missing_damaged','suggestion','other']),
  severity: z.enum(['low','medium','high','urgent']),
  relatedMachine: z.string().optional(),
  description: z.string().min(20, 'Please provide at least 20 characters describing the issue'),
})
type FormData = z.infer<typeof schema>

export default function IssueFormPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'machine_malfunction', severity: 'medium' },
  })

  const onSubmit = async (data: FormData) => {
    if (!user || !profile) { toast.error('Sign in required'); return }
    try {
      await addDocument<Issue>(COLLECTIONS.ISSUES, {
        ...data, userId: user.uid, userName: profile.displayName, userEmail: user.email!,
        status: 'open',
      } as Omit<Issue,'id'|'createdAt'|'updatedAt'>)
      toast.success('Issue reported. Thank you!')
      navigate('/')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to submit') }
  }

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-2xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report an Issue</h1>
          <p className="text-muted-foreground mt-1">Submit feedback, safety concerns, or equipment malfunctions.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Issue Details</CardTitle>
            <CardDescription>Provide information about the issue so staff can address it quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Issue Type <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('type')}>
                <option value="machine_malfunction">Machine Malfunction</option>
                <option value="safety_concern">Safety Concern</option>
                <option value="missing_damaged">Missing / Damaged Item</option>
                <option value="suggestion">Suggestion</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Severity <span className="text-destructive">*</span></Label>
              <select className={selectClasses} {...register('severity')}>
                {['low','medium','high','urgent'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>

            <div className="col-span-full space-y-2">
              <Label>Related Machine / Equipment <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input placeholder="e.g. Laser Cutter, Bambu X1C..." {...register('relatedMachine')} />
            </div>

            <div className="col-span-full space-y-2">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea 
                rows={5} 
                placeholder="Describe the issue in detail. Include when it happened, what you observed, and any immediate actions taken..." 
                className={cn('resize-none', errors.description ? 'border-destructive' : '')} 
                {...register('description')} 
              />
              {errors.description && <p className="text-[0.8rem] text-destructive">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} variant="destructive" className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Submit Report
          </Button>
        </div>
      </form>
    </div>
  )
}

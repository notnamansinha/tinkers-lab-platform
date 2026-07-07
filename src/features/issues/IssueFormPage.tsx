import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addDocument, COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Issue } from '@/types'

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

  const inp = (e: boolean) => cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', e && 'border-destructive')

  return (
    <div className="space-y-6 max-w-xl animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-muted"><ArrowLeft size={18} /></button>
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Feedback</p>
          <h1 className="text-2xl font-display font-bold mt-0.5">Report an Issue</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border bg-card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Issue Type *</label>
            <select className={inp(false)} {...register('type')}>
              <option value="machine_malfunction">Machine Malfunction</option>
              <option value="safety_concern">Safety Concern</option>
              <option value="missing_damaged">Missing / Damaged Item</option>
              <option value="suggestion">Suggestion</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Severity *</label>
            <select className={inp(false)} {...register('severity')}>
              {['low','medium','high','urgent'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Related Machine / Equipment <span className="text-muted-foreground text-xs">(optional)</span></label>
          <input placeholder="e.g. Laser Cutter, Bambu X1C…" className={inp(false)} {...register('relatedMachine')} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description * <span className="text-xs text-muted-foreground">(min 20 chars)</span></label>
          <textarea rows={4} placeholder="Describe the issue in detail. Include when it happened, what you observed, and any immediate actions taken…" className={cn(inp(!!errors.description), 'resize-none')} {...register('description')} />
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" /> : <AlertTriangle size={16} />}
            Submit Report
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">Cancel</button>
        </div>
      </form>
    </div>
  )
}

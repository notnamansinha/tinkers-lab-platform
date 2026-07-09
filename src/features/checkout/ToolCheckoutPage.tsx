import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getUserProjects } from '@/services/firebase/projects'
import { createToolCheckout, returnTool, getActiveUserCheckouts, isCheckoutOverdue, markCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { ArrowLeft, ArrowLeftRight, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn, todayStr } from '@/lib/utils'
import type { ToolCheckout } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// ── Constants from Spec 2 ────────────────────────────────────────────────────
const TOOL_CATEGORIES = ['Power Tools', 'Hand Tools', 'Measurement Tools', 'Safety Equipment', 'Other'] as const
const CONDITIONS       = ['good', 'fair', 'damaged'] as const

const POWER_TOOLS = [
  'Angle Grinder', 'Bench Grinder', 'Jig Saw', 'Cordless Drilling Machine',
  'Air Blower', 'Heat Gun', 'Random Orbit Sander', 'Impact Drill', 'Planner',
]
const HAND_TOOLS = [
  'Hacksaw', 'Hammer', 'Mallet', 'Spanner', 'Pliers', 'Circlip Tool',
  'Cutter', 'Wrench', 'Clamp', 'Knife', 'Screwdriver', 'Snip Cutter',
  'Pipe Cutter', 'Glue Gun', 'File Set', 'Chisel', 'Punch Set',
  'Drill Bit Set', 'Stapler Gun',
]
const MEASUREMENT_TOOLS = [
  'Digital Vernier Caliper', 'Micrometer', 'Steel Rule', 'Degree Protector',
  'Inside Caliper', 'Outside Caliper', 'Engineering Square',
  'Measuring Tape', 'Spirit Level', 'Weighing Scale',
]

// ── Schema ───────────────────────────────────────────────────────────────────
const checkoutSchema = z.object({
  action:    z.enum(['checking_out', 'returning']),
  projectId: z.string().min(1, 'Select a project — all checkouts require a project'),
  toolCategory: z.enum(['Power Tools', 'Hand Tools', 'Measurement Tools', 'Safety Equipment', 'Other']),
  toolName:  z.string().min(1, 'Specify the tool'),
  quantity:  z.coerce.number().min(1, 'Quantity must be at least 1'),
  locationOfUse: z.enum(['in_lab', 'taking_outside']),
  outsideLocation: z.string().optional(),
  expectedReturnDate: z.string().min(1, 'Return date required'),
  expectedReturnTime: z.string().optional(),
  conditionAtCheckout: z.enum(['good', 'fair', 'damaged']),
  notes: z.string().optional(),
}).refine(d => {
  if (d.locationOfUse === 'taking_outside') return !!d.outsideLocation
  return true
}, { message: 'Please specify where you are taking the tool', path: ['outsideLocation'] })
.refine(d => {
  if (d.expectedReturnDate) return d.expectedReturnDate >= todayStr()
  return true
}, { message: 'Return date cannot be in the past', path: ['expectedReturnDate'] })

const returnSchema = z.object({
  checkoutId: z.string().min(1, 'Select the item you are returning'),
  conditionAtReturn: z.enum(['good', 'fair', 'damaged']),
  notes: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>
type ReturnFormData   = z.infer<typeof returnSchema>

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

const selectClass = (err?: string) => cn(
  'flex h-10 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  err && 'border-destructive'
)

// ── Sub-component: Checkout Form ──────────────────────────────────────────────
function CheckoutForm({ projects, user, profile, qc }: any) {
  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema) as any, // eslint-disable-line
    defaultValues: { action: 'checking_out', locationOfUse: 'in_lab', conditionAtCheckout: 'good', quantity: 1 },
  })

  const category      = watch('toolCategory')
  const locationOfUse = watch('locationOfUse')

  // Tool suggestions per category
  const toolSuggestions: Record<string, string[]> = {
    'Power Tools':       POWER_TOOLS,
    'Hand Tools':        HAND_TOOLS,
    'Measurement Tools': MEASUREMENT_TOOLS,
    'Safety Equipment':  ['Goggles', 'Ear Protection', 'Gloves', 'Apron', 'Mask'],
    'Other': [],
  }
  const suggestions = toolSuggestions[category] ?? []

  const onSubmit = async (data: CheckoutFormData) => {
    const selectedProject = projects.find((p: any) => p.id === data.projectId)
    try {
      await createToolCheckout({
        userId:      user.uid,
        userEmail:   user.email!,
        userName:    profile.displayName,
        universityId: profile.universityId,
        projectId:   data.projectId,
        projectTitle: selectedProject?.title ?? '',
        action: 'checking_out',
        toolCategory: data.toolCategory,
        toolName:    data.toolName,
        quantity:    data.quantity,
        locationOfUse: data.locationOfUse,
        outsideLocation: data.outsideLocation,
        expectedReturnDate: data.expectedReturnDate,
        expectedReturnTime: data.expectedReturnTime,
        conditionAtCheckout: data.conditionAtCheckout,
        notes: data.notes,
      })
      toast.success(`${data.toolName} checked out successfully. Return by ${data.expectedReturnDate}.`)
      qc.invalidateQueries({ queryKey: ['toolCheckouts'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Project & Tool</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Project" required error={errors.projectId?.message}>
            <select {...register('projectId')} className={selectClass(errors.projectId?.message)}>
              <option value="">— Select a project —</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.id} — {p.title}</option>)}
            </select>
          </Field>

          <Field label="Tool Category" required error={errors.toolCategory?.message}>
            <select {...register('toolCategory')} className={selectClass(errors.toolCategory?.message)}>
              <option value="">— Select category —</option>
              {TOOL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>

          {category && (
            <Field label="Specific Tool" required hint="Type the tool name or pick from suggestions." error={errors.toolName?.message}>
              <Input {...register('toolName')} placeholder="Tool name" list="tool-suggestions" className={cn(errors.toolName && 'border-destructive')} />
              {suggestions.length > 0 && (
                <datalist id="tool-suggestions">
                  {suggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              )}
            </Field>
          )}

          <Field label="Quantity" required error={errors.quantity?.message}>
            <Input type="number" {...register('quantity')} min={1} className={cn('w-24', errors.quantity && 'border-destructive')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location & Return</CardTitle>
          <CardDescription>Spec: "In Lab vs. Taking Outside Lab, with optional 'where' field for accountability."</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Location of Use" required error={errors.locationOfUse?.message}>
            <div className="grid grid-cols-2 gap-3">
              {(['in_lab', 'taking_outside'] as const).map(val => (
                <label key={val} className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                  watch('locationOfUse') === val ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                )}>
                  <input type="radio" value={val} {...register('locationOfUse')} className="accent-primary" />
                  <span className="text-sm font-medium">{val === 'in_lab' ? '📍 In Lab' : '🏃 Taking Outside'}</span>
                </label>
              ))}
            </div>
          </Field>

          {locationOfUse === 'taking_outside' && (
            <Field label="Where are you taking it?" required error={errors.outsideLocation?.message}
              hint="Building, address, or location description for accountability.">
              <Input {...register('outsideLocation')} placeholder="e.g. Workshop Block B, Room 204" className={cn(errors.outsideLocation && 'border-destructive')} />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Expected Return Date" required error={errors.expectedReturnDate?.message}>
              <Input type="date" {...register('expectedReturnDate')} min={todayStr()} className={cn(errors.expectedReturnDate && 'border-destructive')} />
            </Field>
            <Field label="Expected Return Time">
              <Input type="time" {...register('expectedReturnTime')} />
            </Field>
          </div>

          <Field label="Condition at Checkout" required error={errors.conditionAtCheckout?.message}>
            <div className="flex gap-3">
              {CONDITIONS.map(c => (
                <label key={c} className={cn(
                  'flex-1 py-2 text-center rounded-xl border-2 cursor-pointer text-sm font-medium capitalize transition-colors',
                  watch('conditionAtCheckout') === c ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
                )}>
                  <input type="radio" value={c} {...register('conditionAtCheckout')} className="sr-only" />
                  {c === 'good' ? '✅ Good' : c === 'fair' ? '⚠️ Fair' : '❌ Damaged'}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea {...register('notes')} placeholder="Any notes about the tool or planned use (optional)" className="flex min-h-[70px] w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting} className="min-w-[160px] gap-2">
          {isSubmitting
            ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            : <Package className="w-4 h-4" />}
          Confirm Checkout
        </Button>
      </div>
    </form>
  )
}

// ── Sub-component: Return Form ────────────────────────────────────────────────
function ReturnForm({ activeCheckouts, qc }: { activeCheckouts: ToolCheckout[]; qc: any }) {
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema) as any, // eslint-disable-line
    defaultValues: { conditionAtReturn: 'good' },
  })

  const onSubmit = async (data: ReturnFormData) => {
    try {
      await returnTool(data.checkoutId, data.conditionAtReturn, data.notes)
      toast.success('Tool returned successfully. Thank you!')
      qc.invalidateQueries({ queryKey: ['toolCheckouts'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Return failed')
    }
  }

  if (activeCheckouts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">No active checkouts</p>
          <p className="text-sm text-muted-foreground mt-1">You have no tools currently checked out.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Select Item to Return</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {activeCheckouts.map(c => {
            const overdue = isCheckoutOverdue(c)
            return (
              <label key={c.id} className={cn(
                'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                overdue ? 'border-destructive/40 bg-destructive/5' : 'border-border hover:border-primary/30'
              )}>
                <input type="radio" value={c.id} {...register('checkoutId')} className="mt-1 accent-primary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{c.toolName}</p>
                    {overdue && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">OVERDUE</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.toolCategory} · Qty: {c.quantity} · Due: {c.expectedReturnDate}
                    {c.locationOfUse === 'taking_outside' && c.outsideLocation && ` · 📍 ${c.outsideLocation}`}
                  </p>
                </div>
              </label>
            )
          })}
          {errors.checkoutId && <p className="text-xs text-destructive">{errors.checkoutId.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Condition at Return</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {CONDITIONS.map(c => (
              <label key={c} className={cn(
                'flex-1 py-2 text-center rounded-xl border-2 cursor-pointer text-sm font-medium capitalize transition-colors',
                (document.querySelector(`input[value="${c}"][name="conditionAtReturn"]`) as HTMLInputElement)?.checked
                  ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'
              )}>
                <input type="radio" value={c} {...register('conditionAtReturn')} className="sr-only" />
                {c === 'good' ? '✅ Good' : c === 'fair' ? '⚠️ Fair' : '❌ Damaged'}
              </label>
            ))}
          </div>
          <Field label="Notes">
            <textarea {...register('notes')} placeholder="Describe any damage or issues noticed (optional)" className="flex min-h-[70px] w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="min-w-[160px] gap-2">
          {isSubmitting
            ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            : <ArrowLeftRight className="w-4 h-4" />}
          Confirm Return
        </Button>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ToolCheckoutPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const [mode, setMode] = React.useState<'checkout' | 'return'>('checkout')

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', 'user', user?.uid],
    queryFn: () => getUserProjects(user!.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const { data: activeCheckouts = [] } = useQuery({
    queryKey: ['toolCheckouts', 'active', user?.uid],
    queryFn: () => getActiveUserCheckouts(user!.uid),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  // Mark any overdue checkouts (client-side — server trigger in Phase 9)
  React.useEffect(() => {
    activeCheckouts.forEach(c => {
      if (isCheckoutOverdue(c) && !c.isOverdue) {
        markCheckoutOverdue(c.id)
      }
    })
  }, [activeCheckouts])

  const hasNoProjects = !projectsLoading && projects.length === 0
  const overdueCount  = activeCheckouts.filter(isCheckoutOverdue).length

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-2xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Tool Checkout</h1>
          <p className="text-muted-foreground mt-1">Borrow or return hand tools, power tools, and measurement equipment.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/checkout/history')}>
          History
        </Button>
      </div>

      {/* Overdue warning banner */}
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-destructive">{overdueCount} overdue checkout{overdueCount > 1 ? 's' : ''}!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Please return overdue tools immediately. Switch to "Return" mode below.
            </p>
          </div>
        </div>
      )}

      {/* No project guard */}
      {hasNoProjects && mode === 'checkout' && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-foreground">Register a project first</p>
            <p className="text-xs text-muted-foreground mt-1">
              All checkouts must be linked to a project.{' '}
              <button onClick={() => navigate('/projects/new')} className="text-primary underline underline-offset-2">Register a project →</button>
            </p>
          </div>
        </div>
      )}

      {/* Action toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted border border-border">
        {(['checkout', 'return'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'py-2.5 rounded-lg text-sm font-semibold transition-all capitalize',
              mode === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m === 'checkout' ? '📤 Check Out' : '📥 Return'}
            {m === 'return' && activeCheckouts.length > 0 && (
              <span className={cn('ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold',
                overdueCount > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-primary/20 text-primary'
              )}>{activeCheckouts.length}</span>
            )}
          </button>
        ))}
      </div>

      {mode === 'checkout'
        ? <CheckoutForm projects={projects} user={user} profile={profile} qc={qc} />
        : <ReturnForm   activeCheckouts={activeCheckouts} qc={qc} />
      }
    </div>
  )
}

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getUserCheckoutHistory, getAllActiveCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { returnTool } from '@/services/firebase/toolCheckouts'
import { ArrowLeft, Package, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ToolCheckout } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type FilterMode = 'all' | 'active' | 'overdue' | 'returned'

function statusBadge(c: ToolCheckout) {
  if (c.returnedAt)      return { label: 'Returned', className: 'bg-green-500/10 text-green-600 border-green-500/30' }
  if (isCheckoutOverdue(c)) return { label: 'Overdue',   className: 'bg-destructive/10 text-destructive border-destructive/30' }
  return { label: 'Active', className: 'bg-primary/10 text-primary border-primary/30' }
}

export default function ToolCheckoutListPage() {
  const navigate = useNavigate()
  const { isStaff } = useAuth()
  const { data: user } = useAuth() as any
  const qc = useQueryClient()
  const [filter, setFilter] = React.useState<FilterMode>('all')
  const [returningId, setReturningId] = React.useState<string | null>(null)

  const { data: checkouts = [], isLoading } = useQuery({
    queryKey: ['toolCheckouts', 'history', isStaff],
    queryFn: () => isStaff ? getAllActiveCheckouts() : getUserCheckoutHistory(user?.uid ?? ''),
    enabled: true,
    staleTime: 2 * 60 * 1000,
  })

  const filtered = checkouts.filter(c => {
    if (filter === 'active')   return !c.returnedAt && !isCheckoutOverdue(c)
    if (filter === 'overdue')  return !c.returnedAt && isCheckoutOverdue(c)
    if (filter === 'returned') return !!c.returnedAt
    return true
  })

  const overdueCount  = checkouts.filter(c => !c.returnedAt && isCheckoutOverdue(c)).length
  const activeCount   = checkouts.filter(c => !c.returnedAt && !isCheckoutOverdue(c)).length
  const returnedCount = checkouts.filter(c => !!c.returnedAt).length

  const handleQuickReturn = async (checkoutId: string) => {
    setReturningId(checkoutId)
    try {
      await returnTool(checkoutId, 'good')
      toast.success('Marked as returned.')
      qc.invalidateQueries({ queryKey: ['toolCheckouts'] })
    } catch (e) {
      toast.error('Failed to mark as returned')
    } finally {
      setReturningId(null)
    }
  }

  const FILTERS: { key: FilterMode; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: checkouts.length },
    { key: 'active',   label: 'Active',   count: activeCount },
    { key: 'overdue',  label: 'Overdue',  count: overdueCount },
    { key: 'returned', label: 'Returned', count: returnedCount },
  ]

  return (
    <div className="space-y-6 container py-6 mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {isStaff ? 'All Checkouts' : 'My Checkouts'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isStaff ? 'Staff view — all active tool checkouts across all users.' : 'Your tool checkout and return history.'}
          </p>
        </div>
        <Button onClick={() => navigate('/checkout')} className="gap-2">
          <Package className="w-4 h-4" /> Checkout a Tool
        </Button>
      </div>

      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-sm text-destructive">{overdueCount} overdue tool{overdueCount > 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              These items are past their expected return date. Please return them immediately.
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active',   count: activeCount,   icon: <Clock className="w-5 h-5 text-primary" /> },
          { label: 'Overdue',  count: overdueCount,  icon: <AlertTriangle className="w-5 h-5 text-destructive" /> },
          { label: 'Returned', count: returnedCount, icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
        ].map(s => (
          <Card key={s.label} className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <p className="text-2xl font-bold text-foreground">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all',
              filter === f.key
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background border-border text-muted-foreground hover:border-foreground/40'
            )}
          >
            {f.label}
            <span className={cn('ml-1.5 text-xs font-bold', f.key === 'overdue' && f.count > 0 ? 'text-destructive' : '')}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Checkout list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading checkouts…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">No {filter === 'all' ? '' : filter} checkouts</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'all' ? 'Start by checking out a tool.' : 'Nothing matches this filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const badge   = statusBadge(c)
            const overdue = isCheckoutOverdue(c)
            return (
              <Card key={c.id} className={cn('transition-all', overdue && !c.returnedAt && 'border-destructive/40')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-base text-foreground">{c.toolName}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', badge.className)}>
                          {badge.label}
                        </span>
                        {c.locationOfUse === 'taking_outside' && (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 font-medium">
                            📍 Off-premises
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>{c.toolCategory} · Qty: {c.quantity} · Condition: <span className="capitalize">{c.conditionAtCheckout}</span></p>
                        <p>Project: {c.projectTitle || c.projectId}</p>
                        <p>
                          Checked out: {new Date(c.createdAt?.toDate?.()).toLocaleDateString()} ·
                          Due: <span className={cn('font-medium', overdue && !c.returnedAt ? 'text-destructive' : 'text-foreground')}>
                            {c.expectedReturnDate}
                          </span>
                        </p>
                        {c.outsideLocation && <p>Location: {c.outsideLocation}</p>}
                        {c.returnedAt && c.conditionAtReturn && (
                          <p>Returned in: <span className="capitalize font-medium">{c.conditionAtReturn}</span> condition</p>
                        )}
                      </div>
                    </div>
                    {/* Quick return for staff or own active item */}
                    {!c.returnedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickReturn(c.id)}
                        disabled={returningId === c.id}
                        className={cn('shrink-0', overdue && 'border-destructive text-destructive hover:bg-destructive/10')}
                      >
                        {returningId === c.id
                          ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : 'Return'
                        }
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

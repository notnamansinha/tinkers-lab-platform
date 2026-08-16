import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getUserCheckoutHistory, getAllCheckouts, returnTool, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { Package, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ToolCheckout } from '@/types'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { DataPanel } from '@/components/common/DataPanel'
import { KpiTile } from '@/components/common/KpiTile'
import { toast } from 'sonner'

export default function ToolCheckoutListPage() {
  const { user, isStaff, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('all')
  const [returningId, setReturningId] = useState<string | null>(null)

  const { data: checkouts = [], isLoading } = useQuery({
    queryKey: ['toolCheckouts', isStaff ? 'all' : user?.uid],
    queryFn: () => (isStaff ? getAllCheckouts() : getUserCheckoutHistory(user!.uid)),
    enabled: Boolean(user),
  })

  const activeCheckouts = checkouts.filter((c: ToolCheckout) => !c.returnedAt)
  const overdueCheckouts = activeCheckouts.filter((c: ToolCheckout) => isCheckoutOverdue(c))
  const returnedCheckouts = checkouts.filter((c: ToolCheckout) => Boolean(c.returnedAt))

  const activeCount = activeCheckouts.length
  const overdueCount = overdueCheckouts.length
  const returnedCount = returnedCheckouts.length

  const filtered = checkouts.filter((c: ToolCheckout) => {
    if (filter === 'active') return !c.returnedAt
    if (filter === 'overdue') return isCheckoutOverdue(c)
    if (filter === 'returned') return Boolean(c.returnedAt)
    return true
  })

  const handleQuickReturn = async (c: ToolCheckout) => {
    setReturningId(c.id)
    try {
      await returnTool(c.projectId, c.id, 'good', undefined, {
        uid: profile?.uid ?? user?.uid ?? c.userId,
        name: profile?.displayName ?? c.userName,
        email: profile?.email ?? c.userEmail,
      })
      toast.success('Tool marked as returned!')
      queryClient.invalidateQueries({ queryKey: ['toolCheckouts'] })
    } catch {
      toast.error('Failed to mark tool return.')
    } finally {
      setReturningId(null)
    }
  }

  const statusBadge = (c: ToolCheckout) => {
    if (c.returnedAt) return { label: 'Returned', className: 'bg-lime/15 text-lime border border-lime/30' }
    if (isCheckoutOverdue(c)) return { label: 'Overdue', className: 'bg-pink/15 text-pink border border-pink/30' }
    return { label: 'Active', className: 'bg-indigo/15 text-indigo border border-indigo/30' }
  }

  const FILTERS = [
    { key: 'all' as const, label: 'All', count: checkouts.length },
    { key: 'active' as const, label: 'Active', count: activeCount },
    { key: 'overdue' as const, label: 'Overdue', count: overdueCount },
    { key: 'returned' as const, label: 'Returned', count: returnedCount },
  ]

  return (
    <div className="mx-auto mt-2 w-full max-w-[1440px] min-w-0 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors text-xs font-bold">
        ← Back
      </button>

      <PageHeader
        variant="dark"
        title={isStaff ? 'All Tool Checkouts' : 'My Tool Checkouts'}
        description={isStaff ? 'All tool checkouts across lab users — including returned items.' : 'Your tool checkout and return history.'}
        action={
          <button
            onClick={() => navigate('/checkout')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lime text-black font-bold text-xs hover:bg-lime/90 transition-all shadow-sm"
          >
            <Package size={16} /> Checkout Tool
          </button>
        }
      />

      {overdueCount > 0 && (
        <div className="bg-pink/15 border border-pink/30 text-pink p-4 mb-6 flex items-center gap-3 rounded-card">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">{overdueCount} overdue tool{overdueCount > 1 ? 's' : ''}: </span>
            <span className="text-white/80">Please return them promptly to ensure tool availability.</span>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3 sm:gap-4">
        <KpiTile label="Active" value={activeCount} color="#514AF1" textColor="light" icon={Clock} />
        <KpiTile label="Overdue" value={overdueCount} color={overdueCount > 0 ? '#EC68D8' : '#141517'} textColor={overdueCount > 0 ? 'dark' : 'light'} icon={AlertTriangle} />
        <KpiTile label="Returned" value={returnedCount} color="#DDF237" textColor="dark" icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <FilterChip
            key={f.key}
            label={`${f.label} (${f.count})`}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
          />
        ))}
      </div>

      <DataPanel title="Checkout History">
        {isLoading ? (
          <div className="py-12 text-center text-white/40 text-xs">Loading checkouts…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-2 text-white/30 text-xs">
            <Package className="w-8 h-8 opacity-30" />
            <p className="font-bold text-white/50">No {filter === 'all' ? '' : filter} checkouts</p>
            <p className="text-white/40">{filter === 'all' ? 'Start by checking out a tool.' : 'Nothing matches this filter.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c: ToolCheckout) => {
              const badge = statusBadge(c)
              const overdue = isCheckoutOverdue(c)
              return (
                <div
                  key={c.id}
                  className={cn(
                    'rounded-xl p-4 border transition-all',
                    overdue && !c.returnedAt ? 'bg-pink/10 border-pink/30' : 'bg-near-black border-hairline',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className="font-bold text-sm text-white">{c.toolName}</p>
                        <span className={cn('text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider', badge.className)}>
                          {badge.label}
                        </span>
                        {c.locationOfUse === 'taking_outside' && (
                          <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-orange/15 text-orange border border-orange/30 font-bold uppercase tracking-wider">
                            Off-premises
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/60 space-y-0.5">
                        <p>{c.toolCategory} · Qty: {c.quantity} · Condition: <span className="capitalize">{c.conditionAtCheckout}</span></p>
                        <p>Project: {c.projectTitle || c.projectId}</p>
                        <p>
                          Checked out: {new Date(c.createdAt?.toDate?.()).toLocaleDateString()} · Due:{' '}
                          <span className={cn('font-bold', overdue && !c.returnedAt ? 'text-pink' : 'text-white')}>
                            {c.expectedReturnDate}
                          </span>
                        </p>
                        {c.outsideLocation && <p>Location: {c.outsideLocation}</p>}
                        {c.returnedAt && c.conditionAtReturn && (
                          <p>Returned in: <span className="capitalize font-bold text-lime">{c.conditionAtReturn}</span> condition</p>
                        )}
                      </div>
                    </div>
                    {!c.returnedAt && (
                      <button
                        onClick={() => handleQuickReturn(c)}
                        disabled={returningId === c.id}
                        className={cn(
                          'shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all',
                          overdue ? 'border-pink text-pink hover:bg-pink/20' : 'border-white/20 text-white hover:bg-white/10',
                        )}
                      >
                        {returningId === c.id
                          ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : 'Return'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DataPanel>
    </div>
  )
}

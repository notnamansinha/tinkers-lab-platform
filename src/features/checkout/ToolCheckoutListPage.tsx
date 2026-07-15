import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { getUserCheckoutHistory, getAllActiveCheckouts, isCheckoutOverdue, returnTool } from '@/services/firebase/toolCheckouts'
import { ArrowLeft, Package, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ToolCheckout } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { KpiTile } from '@/components/common/KpiTile'
import { DataPanel } from '@/components/common/DataPanel'

type FilterMode = 'all' | 'active' | 'overdue' | 'returned'

function statusBadge(c: ToolCheckout) {
  if (c.returnedAt) return { label: 'Returned', className: 'bg-lime text-white' }
  if (isCheckoutOverdue(c)) return { label: 'Overdue', className: 'bg-pink text-white' }
  return { label: 'Active', className: 'bg-indigo text-white' }
}

export default function ToolCheckoutListPage() {
  const navigate = useNavigate()
  const { isStaff, user } = useAuth()
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
    if (filter === 'active') return !c.returnedAt && !isCheckoutOverdue(c)
    if (filter === 'overdue') return !c.returnedAt && isCheckoutOverdue(c)
    if (filter === 'returned') return !!c.returnedAt
    return true
  })

  const overdueCount = checkouts.filter(c => !c.returnedAt && isCheckoutOverdue(c)).length
  const activeCount = checkouts.filter(c => !c.returnedAt && !isCheckoutOverdue(c)).length
  const returnedCount = checkouts.filter(c => !!c.returnedAt).length

  const handleQuickReturn = async (checkoutId: string) => {
    setReturningId(checkoutId)
    try {
      await returnTool(checkoutId, 'good')
      toast.success('Marked as returned.')
      qc.invalidateQueries({ queryKey: ['toolCheckouts'] })
    } catch {
      toast.error('Failed to mark as returned')
    } finally {
      setReturningId(null)
    }
  }

  const FILTERS: { key: FilterMode; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: checkouts.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'overdue', label: 'Overdue', count: overdueCount },
    { key: 'returned', label: 'Returned', count: returnedCount },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Back
      </button>

      <PageHeader
        variant="dark"
        title={isStaff ? 'All Checkouts' : 'My Checkouts'}
        description={isStaff ? 'Staff view — all active tool checkouts across users.' : 'Your tool checkout and return history.'}
        action={
          <button onClick={() => navigate('/checkout')} className="tl-pill-button flex items-center gap-2 px-6">
            <Package size={18} /> Checkout Tool
          </button>
        }
      />

      {overdueCount > 0 && (
        <div className="bg-[rgba(236,104,216,0.15)] border border-[rgba(236,104,216,0.3)] text-white p-5 mb-6 flex items-start gap-3 rounded-[20px]">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white">{overdueCount} overdue tool{overdueCount > 1 ? 's' : ''}</p>
            <p className="text-white/70 text-sm mt-1">Return them immediately to avoid penalties.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiTile label="Active" value={activeCount} color="#514AF1" textColor="light" icon={Clock} />
        <KpiTile label="Overdue" value={overdueCount} color={overdueCount > 0 ? '#EC68D8' : '#181818'} textColor={overdueCount > 0 ? 'dark' : 'light'} icon={AlertTriangle} />
        <KpiTile label="Returned" value={returnedCount} color="#DDF237" icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <FilterChip
            key={f.key}
            label={`${f.label} (${f.count})`}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
            tone="dark"
          />
        ))}
      </div>

      <DataPanel title="Checkout History">
        {isLoading ? (
          <div className="py-12 text-center text-white/40">Loading checkouts…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-3 text-white/40">
            <Package className="w-10 h-10 opacity-30" />
            <p className="font-medium text-white/60">No {filter === 'all' ? '' : filter} checkouts</p>
            <p className="text-sm">{filter === 'all' ? 'Start by checking out a tool.' : 'Nothing matches this filter.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const badge = statusBadge(c)
              const overdue = isCheckoutOverdue(c)
              return (
                <div
                  key={c.id}
                  className={cn(
                    'rounded-[20px] p-4 border transition-all',
                    overdue && !c.returnedAt ? 'bg-pink/10 border-pink/30' : 'bg-black/[0.03] border-black/[0.06]',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className="font-semibold text-base text-white">{c.toolName}</p>
                        <span className={cn('text-xs px-3 py-0.5 rounded-full font-bold uppercase tracking-wider', badge.className)}>
                          {badge.label}
                        </span>
                        {c.locationOfUse === 'taking_outside' && (
                          <span className="text-xs px-3 py-0.5 rounded-full bg-orange/20 text-orange font-bold uppercase tracking-wider">
                            Off-premises
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/55 space-y-0.5">
                        <p>{c.toolCategory} · Qty: {c.quantity} · Condition: <span className="capitalize">{c.conditionAtCheckout}</span></p>
                        <p>Project: {c.projectTitle || c.projectId}</p>
                        <p>
                          Checked out: {new Date(c.createdAt?.toDate?.()).toLocaleDateString()} · Due:{' '}
                          <span className={cn('font-semibold', overdue && !c.returnedAt ? 'text-pink' : 'text-white')}>
                            {c.expectedReturnDate}
                          </span>
                        </p>
                        {c.outsideLocation && <p>Location: {c.outsideLocation}</p>}
                        {c.returnedAt && c.conditionAtReturn && (
                          <p>Returned in: <span className="capitalize font-semibold">{c.conditionAtReturn}</span> condition</p>
                        )}
                      </div>
                    </div>
                    {!c.returnedAt && (
                      <button
                        onClick={() => handleQuickReturn(c.id)}
                        disabled={returningId === c.id}
                        className={cn(
                          'shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border-2 transition-all',
                          overdue ? 'border-pink text-pink hover:bg-pink/10' : 'border-white/10 text-white hover:bg-black/5',
                        )}
                      >
                        {returningId === c.id
                          ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
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

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { updateBookingStatus } from '@/services/firebase/bookings'
import { Search, Calendar, XCircle } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Booking } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { DataPanel } from '@/components/common/DataPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_COLOR: Record<string, string> = {
  approved: 'bg-[rgba(221,242,55,0.15)] text-[#DDF237]',
  rejected: 'bg-[rgba(236,104,216,0.15)] text-[#EC68D8]',
  cancelled: 'bg-[rgba(255,255,255,0.1)] text-[#7D9FC2]',
  completed: 'bg-[rgba(81,74,241,0.2)] text-[#9B97F7]',
}

export default function AdminBookingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin', 'bookings'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, COLLECTIONS.BOOKINGS), orderBy('createdAt', 'desc')))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    staleTime: 2 * 60 * 1000,
  })

  const filtered = bookings.filter(b => {
    const matchSearch = !search || b.machineName.toLowerCase().includes(search.toLowerCase()) || b.userName?.toLowerCase().includes(search.toLowerCase()) || b.userEmail.toLowerCase().includes(search.toLowerCase())
    return matchSearch && (filterStatus === 'all' || b.status === filterStatus)
  })

  const reject = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') ?? ''
    await updateBookingStatus(id, 'rejected', { rejectionReason: reason })
    toast.success('Booking rejected')
    qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in mt-4">
      <PageHeader
        variant="dark"
        title="Bookings"
        description={`${bookings.length} total · Review and manage all machine reservations.`}
        action={
          <div className="w-12 h-12 bg-white/40 border border-white/20 shadow-sm border border-[#6FA9FF]/50 rounded-full flex items-center justify-center">
            <Calendar size={22} className="text-[#FFB13F]" />
          </div>
        }
        filters={
          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
            <div className="relative w-full lg:w-80 flex-shrink-0">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#7D9FC2]" />
              <input type="text" placeholder="Search bookings…" value={search} onChange={e => setSearch(e.target.value)} className="tl-input pl-12 w-full h-[44px]" />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All statuses" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
              {['approved', 'rejected', 'cancelled', 'completed'].map(s => (
                <FilterChip key={s} label={s} active={filterStatus === s} onClick={() => setFilterStatus(s)} />
              ))}
            </div>
          </div>
        }
      />

      <DataPanel title="All Bookings" description={`${filtered.length} of ${bookings.length} · Latest first`}>
        <div className="overflow-hidden rounded-[16px] border border-white/20">
          <Table>
            <TableHeader className="bg-[rgba(255,255,255,0.02)]">
              <TableRow className="hover:bg-transparent border-white/20">
                <TableHead className="text-[#7D9FC2] font-semibold">#</TableHead>
                <TableHead className="text-[#7D9FC2] font-semibold">Machine</TableHead>
                <TableHead className="text-[#7D9FC2] font-semibold">Date</TableHead>
                <TableHead className="text-[#7D9FC2] font-semibold">Time</TableHead>
                <TableHead className="text-[#7D9FC2] font-semibold">Booked By</TableHead>
                <TableHead className="text-[#7D9FC2] font-semibold">Purpose</TableHead>
                <TableHead className="text-[#7D9FC2] font-semibold">Submitted</TableHead>
                <TableHead className="text-[#7D9FC2] font-semibold">Status</TableHead>
                <TableHead className="text-right text-[#7D9FC2] font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="h-32 text-center text-[#7D9FC2] border-0">Loading…</TableCell></TableRow>
              ) : filtered.map((b, idx) => (
                <TableRow key={b.id} className="border-white/20 hover:bg-white/40 border border-white/20 shadow-sm transition-colors">
                  <TableCell className="text-[#7D9FC2] font-mono text-[12px]">{filtered.length - idx}</TableCell>
                  <TableCell className="font-semibold text-[#56779D]">{b.machineName}</TableCell>
                  <TableCell className="text-white/70 text-[13px]">{b.date}</TableCell>
                  <TableCell className="text-white/70 text-[13px]">{b.startTime}–{b.endTime}</TableCell>
                  <TableCell>
                    <div className="text-[13px] font-medium text-[#56779D]">{b.userName || '—'}</div>
                    <div className="text-[11px] text-[#7D9FC2]">{b.userEmail}</div>
                  </TableCell>
                  <TableCell className="text-[#7D9FC2] text-[13px] max-w-[160px] truncate">{b.purpose}</TableCell>
                  <TableCell className="text-[#7D9FC2] text-[12px]">{formatDateTime(b.createdAt)}</TableCell>
                  <TableCell>
                    <span className={cn('text-[10px] px-2.5 py-1 rounded-[6px] font-bold uppercase tracking-widest border border-transparent', STATUS_COLOR[b.status] || 'bg-white/40 border border-white/20 shadow-sm text-[#7D9FC2]')}>{b.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {b.status === 'approved' && (
                      <button onClick={() => reject(b.id)} className="p-2 rounded-full hover:bg-[rgba(236,104,216,0.1)] text-[#EC68D8] transition-colors" aria-label="Reject booking">
                        <XCircle size={16} />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataPanel>
    </div>
  )
}

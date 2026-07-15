import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Search, Package, Plus } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import type { InventoryItem } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { DataPanel } from '@/components/common/DataPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_COLOR: Record<string, string> = {
  in_stock: 'bg-lime text-white',
  low_stock: 'bg-orange text-white',
  out_of_stock: 'bg-pink text-white',
}

export default function AdminInventoryPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'inventory'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.INVENTORY)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryItem)
    },
    staleTime: 5 * 60 * 1000,
  })

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || i.status === filterStatus
    return matchSearch && matchStatus
  })

  const attentionCount = items.filter(i => i.status !== 'in_stock').length

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Inventory"
        description={`${items.length} total items · ${attentionCount} require attention.`}
        action={
          <Link to="/inventory/new" className="tl-pill-button flex items-center gap-2 px-6">
            <Plus size={18} /> Add Item
          </Link>
        }
        filters={
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative w-full lg:w-80 flex-shrink-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D9FC2]" />
              <input type="text" placeholder="Search inventory…" value={search} onChange={e => setSearch(e.target.value)} className="tl-input pl-11 w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All statuses" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
              {['in_stock', 'low_stock', 'out_of_stock'].map(s => (
                <FilterChip key={s} label={s.replace('_', ' ')} active={filterStatus === s} onClick={() => setFilterStatus(s)} />
              ))}
            </div>
          </div>
        }
      />

      <DataPanel title="Inventory Catalog" description={`${filtered.length} of ${items.length} · Latest first`}>
        <Table className="">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-0">
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="h-32 text-center text-[#7D9FC2]">Loading…</TableCell></TableRow>
            ) : filtered.map((item, idx) => (
              <TableRow key={item.id} className="border-0">
                <TableCell className="text-[#7D9FC2] font-mono text-xs">{filtered.length - idx}</TableCell>
                <TableCell className="font-semibold text-[#56779D]">{item.name}</TableCell>
                <TableCell className="text-[#7D9FC2] text-xs uppercase">{item.category}</TableCell>
                <TableCell className={cn('font-mono text-right font-bold', item.quantity === 0 ? 'text-pink' : item.quantity <= item.minQuantity ? 'text-orange' : 'text-[#56779D]')}>{item.quantity}</TableCell>
                <TableCell className="font-mono text-xs text-[#7D9FC2] text-right">{item.minQuantity}</TableCell>
                <TableCell className="text-[#7D9FC2] text-sm">{item.unit}</TableCell>
                <TableCell className="text-[#7D9FC2] text-sm">{item.location || '—'}</TableCell>
                <TableCell><span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', STATUS_COLOR[item.status])}>{item.status.replace('_', ' ')}</span></TableCell>
                <TableCell className="text-[#7D9FC2] text-sm">{formatDateTime(item.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Link to={`/inventory/${item.id}/edit`} className="text-xs font-bold text-indigo hover:text-pink uppercase tracking-wider">Edit</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>
    </div>
  )
}

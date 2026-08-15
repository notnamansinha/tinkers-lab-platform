import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Package, AlertCircle } from 'lucide-react'
import type { InventoryItem } from '@/types'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { DataPanel } from '@/components/common/DataPanel'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function InventoryListPage() {
  const { isStaff } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.INVENTORY)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryItem)
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || i.status === filterStatus
    return matchSearch && matchStatus
  })

  const outOfStock = items.filter(i => i.status === 'out_of_stock').length
  const lowStock = items.filter(i => i.status === 'low_stock').length

  return (
    <div className="mx-auto mt-2 w-full max-w-[1440px] min-w-0 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Inventory & Stock"
        description="Materials, components, consumables and lab hand tools catalog."
        action={
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="outline"
              className="gap-2 text-xs font-bold text-white bg-white/5 border border-hairline hover:bg-white/10 rounded-full px-5 h-10"
              onClick={() => navigate('/checkout')}
            >
              <Package className="h-4 w-4 text-orange" /> Tool Checkout
            </Button>
            {isStaff && (
              <button
                onClick={() => navigate('/inventory/new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lime text-black font-bold text-xs hover:bg-lime/90 transition-all shadow-sm"
              >
                <Plus size={16} /> Add Item
              </button>
            )}
          </div>
        }
        filters={
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative w-full lg:w-80 shrink-0">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search inventory..."
                aria-label="Search inventory"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-near-black border border-hairline text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'in_stock', 'low_stock', 'out_of_stock'].map(s => (
                <FilterChip
                  key={s}
                  label={s === 'all' ? 'All Statuses' : s.replace('_', ' ')}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(s)}
                />
              ))}
            </div>
          </div>
        }
      />

      {(outOfStock > 0 || lowStock > 0) && (
        <div className="bg-pink/15 border border-pink/30 p-4 mb-6 flex items-center gap-3 rounded-card text-pink">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Low Stock Alert: </span>
            <span className="text-white/80">
              {outOfStock > 0 ? `${outOfStock} items out of stock` : ''}
              {outOfStock > 0 && lowStock > 0 ? ', ' : ''}
              {lowStock > 0 ? `${lowStock} items running low` : ''}.
            </span>
          </div>
        </div>
      )}

      <DataPanel title="All Items" description={`${filtered.length} items in catalog`}>
        <div className="overflow-hidden rounded-xl border border-hairline bg-near-black">
          <Table>
            <TableHeader className="bg-white/[0.03]">
              <TableRow className="hover:bg-transparent border-hairline">
                <TableHead className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Item</TableHead>
               <TableHead className="hidden text-white/40 text-[10px] uppercase font-bold tracking-widest sm:table-cell">Category</TableHead>
                <TableHead className="text-right text-white/40 text-[10px] uppercase font-bold tracking-widest">Qty</TableHead>
               <TableHead className="hidden text-right text-white/40 text-[10px] uppercase font-bold tracking-widest sm:table-cell">Min</TableHead>
               <TableHead className="hidden text-white/40 text-[10px] uppercase font-bold tracking-widest md:table-cell">Unit</TableHead>
               <TableHead className="hidden text-white/40 text-[10px] uppercase font-bold tracking-widest lg:table-cell">Location</TableHead>
                <TableHead className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Status</TableHead>
                <TableHead className="text-right text-white/40 text-[10px] uppercase font-bold tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-hairline">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-white/40 border-0">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                      <span className="text-xs">Loading inventory...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center border-0">
                    <div className="flex flex-col items-center justify-center text-white/30 text-xs">
                      <Package className="h-7 w-7 mb-2 opacity-30" />
                      No items found matching your search.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer group border-hairline hover:bg-white/[0.04] transition-colors"
                    onClick={() => navigate(`/inventory/${item.id}`)}
                  >
                    <TableCell className="font-bold text-white group-hover:text-lime transition-colors text-xs sm:text-sm">
                      {item.name}
                    </TableCell>
                     <TableCell className="hidden text-xs font-medium text-white/50 sm:table-cell">{item.category}</TableCell>
                    <TableCell className={cn(
                      'font-data text-right font-extrabold text-sm',
                      item.quantity === 0 ? 'text-pink' : item.quantity <= item.minQuantity ? 'text-orange' : 'text-white'
                    )}>
                      {item.quantity}
                    </TableCell>
                     <TableCell className="hidden font-data text-right text-xs text-white/40 sm:table-cell">{item.minQuantity}</TableCell>
                     <TableCell className="hidden text-xs text-white/50 md:table-cell">{item.unit}</TableCell>
                     <TableCell className="hidden text-xs text-white/50 lg:table-cell">{item.location || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "uppercase tracking-widest text-[9px] font-bold border",
                        item.status === 'in_stock' ? "bg-lime/15 text-lime border-lime/30" :
                        item.status === 'out_of_stock' ? "bg-pink/15 text-pink border-pink/30" :
                        "bg-orange/15 text-orange border-orange/30"
                      )}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                         className="rounded-full text-xs text-white/40 transition-all hover:bg-white/10 hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-lime sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={e => { e.stopPropagation(); navigate(`/inventory/${item.id}`) }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataPanel>
    </div>
  )
}

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

const STATUS_VARIANT = {
  in_stock: 'default',
  low_stock: 'secondary',
  out_of_stock: 'destructive',
} as const

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
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in mt-4">
      <PageHeader
        variant="dark"
        title="Inventory"
        description="Materials, components, consumables and hand tools."
        action={
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button variant="outline" className="gap-2 text-white bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white rounded-full px-5 h-12" onClick={() => navigate('/checkout')}>
              <Package className="h-4 w-4" /> Tool Checkout
            </Button>
            {isStaff && (
              <button onClick={() => navigate('/inventory/new')} className="tl-pill-button-secondary flex items-center gap-2 px-6">
                <Plus size={18} /> Add Item
              </button>
            )}
          </div>
        }
        filters={
          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
            <div className="relative w-full lg:w-96 flex-shrink-0">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="tl-input pl-12 w-full h-[44px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'in_stock', 'low_stock', 'out_of_stock'].map(s => (
                <FilterChip
                  key={s}
                  label={s === 'all' ? 'All Statuses' : s.replace('_', ' ')}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(s)}
                  tone="dark"
                />
              ))}
            </div>
          </div>
        }
      />

      {(outOfStock > 0 || lowStock > 0) && (
        <div className="bg-[#EC68D8] p-5 mb-8 flex items-start gap-4 rounded-[20px] shadow-[0_12px_40px_rgba(236,104,216,0.2)]">
          <AlertCircle className="h-6 w-6 shrink-0 mt-0.5 text-white" />
          <div>
            <p className="font-bold text-white text-[15px]">Low Stock Alert</p>
            <p className="text-white/70 text-[13px] mt-1 font-medium">
              {outOfStock > 0 ? `${outOfStock} items out of stock` : ''}
              {outOfStock > 0 && lowStock > 0 ? ', ' : ''}
              {lowStock > 0 ? `${lowStock} items running low` : ''}.
            </p>
          </div>
        </div>
      )}

      <DataPanel title="All Items" description={`${filtered.length} items in catalog`}>
        <div className="overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.05)]">
          <Table>
            <TableHeader className="bg-[rgba(255,255,255,0.02)]">
              <TableRow className="hover:bg-transparent border-[rgba(255,255,255,0.05)]">
                <TableHead className="text-white/40 font-semibold tracking-wide">Item</TableHead>
                <TableHead className="text-white/40 font-semibold tracking-wide">Category</TableHead>
                <TableHead className="text-right text-white/40 font-semibold tracking-wide">Qty</TableHead>
                <TableHead className="text-right text-white/40 font-semibold tracking-wide">Min</TableHead>
                <TableHead className="text-white/40 font-semibold tracking-wide">Unit</TableHead>
                <TableHead className="text-white/40 font-semibold tracking-wide">Location</TableHead>
                <TableHead className="text-white/40 font-semibold tracking-wide">Status</TableHead>
                <TableHead className="text-right text-white/40 font-semibold tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-white/40 border-0">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                      Loading inventory...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center border-0">
                    <div className="flex flex-col items-center justify-center text-white/30">
                      <Package className="h-8 w-8 mb-3 opacity-20" />
                      No items found matching your criteria.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer group border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    onClick={() => navigate(`/inventory/${item.id}`)}
                  >
                    <TableCell className="font-semibold max-w-[240px] truncate text-white group-hover:text-[#514AF1] transition-colors text-[14px]">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-white/40 text-[11px] uppercase tracking-wider font-semibold">{item.category}</TableCell>
                    <TableCell className={cn(
                      'font-mono text-right font-bold text-[14px]',
                      item.quantity === 0 ? 'text-[#EC68D8]' : item.quantity <= item.minQuantity ? 'text-[#FFB13F]' : 'text-white',
                    )}>
                      {item.quantity}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-white/30 text-right">{item.minQuantity}</TableCell>
                    <TableCell className="text-[12px] text-white/40 font-medium">{item.unit}</TableCell>
                    <TableCell className="text-[12px] text-white/40 font-medium">{item.location || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "uppercase tracking-widest text-[9px] font-bold border-0",
                        item.status === 'in_stock' ? "bg-[rgba(221,242,55,0.15)] text-[#DDF237]" :
                        item.status === 'out_of_stock' ? "bg-[rgba(236,104,216,0.15)] text-[#EC68D8]" :
                        "bg-[rgba(255,177,63,0.15)] text-[#FFB13F]"
                      )}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/30 hover:text-white opacity-0 group-hover:opacity-100 rounded-full hover:bg-[rgba(255,255,255,0.1)] transition-all"
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

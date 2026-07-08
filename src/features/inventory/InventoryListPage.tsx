import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Package } from 'lucide-react'
import type { InventoryItem } from '@/types'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

const STATUS_COLOR = { 
  in_stock: 'default', 
  low_stock: 'secondary', 
  out_of_stock: 'destructive' 
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
    <div className="space-y-8 max-w-[1400px] py-8 mx-auto animate-fade-in px-4">
      {/* Header section with gradient */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Inventory
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-lg">
            Materials, components, consumables and hand tools.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Button variant="outline" size="lg" className="gap-2 shadow-sm font-semibold bg-background/50 backdrop-blur-md" onClick={() => navigate('/checkout')}>
            <Package className="h-5 w-5" /> Tool Checkout
          </Button>
          {isStaff && (
            <Button size="lg" className="gap-2 font-bold shadow-md" onClick={() => navigate('/inventory/new')}>
              <Plus className="h-5 w-5" /> Add Item
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search inventory by name or category..." 
            className="pl-9 bg-background/50 h-11" 
          />
        </div>
        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || '')}>
          <SelectTrigger className="w-[200px] h-11 bg-background/50">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(outOfStock > 0 || lowStock > 0) && (
        <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 backdrop-blur-sm shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold tracking-tight">Low Stock Alert</AlertTitle>
          <AlertDescription className="font-medium">
            {outOfStock > 0 ? `${outOfStock} items out of stock` : ''}
            {outOfStock > 0 && lowStock > 0 ? ', ' : ''}
            {lowStock > 0 ? `${lowStock} items running low` : ''}.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/60 backdrop-blur-sm border-border shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">Item</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="text-right font-semibold">Qty</TableHead>
              <TableHead className="text-right font-semibold">Min</TableHead>
              <TableHead className="font-semibold">Unit</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mb-3"></div>
                    Loading inventory...
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
               <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8 text-muted-foreground/30 mb-3" />
                    No items found matching your criteria.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => (
                <TableRow key={item.id} className="cursor-pointer group hover:bg-muted/30 transition-colors" onClick={() => navigate(`/inventory/${item.id}`)}>
                  <TableCell className="font-medium max-w-[240px] truncate text-foreground group-hover:text-primary transition-colors">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs uppercase font-medium">{item.category}</TableCell>
                  <TableCell className={cn('font-mono text-right', item.quantity === 0 ? 'text-destructive font-bold' : item.quantity <= item.minQuantity ? 'text-orange-500 font-bold' : 'text-primary')}>
                    {item.quantity}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground text-right">{item.minQuantity}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.unit}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.location || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLOR[item.status as keyof typeof STATUS_COLOR] || 'default'} className="capitalize shadow-sm">
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); navigate(`/inventory/${item.id}`); }}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}


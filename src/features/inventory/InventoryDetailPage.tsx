import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Edit, TrendingDown, TrendingUp } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { InventoryItem, InventoryTransaction } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isStaff } = useAuth()

  const { data: item, isLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, COLLECTIONS.INVENTORY, id!))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as InventoryItem
    },
    enabled: !!id,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['inventoryTransactions', id],
    queryFn: async () => {
      const q = query(collection(db, COLLECTIONS.INVENTORY_TRANSACTIONS), where('itemId', '==', id!), limit(20))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryTransaction)
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <LoadingSpinner text="Loading…" />
  if (!item) return <div className="py-16 text-center text-muted-foreground">Item not found. <Link to="/inventory" className="text-primary hover:underline">← Back</Link></div>

  const statusVariant = {
    in_stock: 'default',
    low_stock: 'secondary',
    out_of_stock: 'destructive'
  }[item.status] as any || 'outline'

  return (
    <div className="container py-6 mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">{item.category}</p>
          <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
        </div>
        <Badge variant={statusVariant} className="text-sm px-3 py-1 capitalize">
          {item.status.replace('_', ' ')}
        </Badge>
        {isStaff && (
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/inventory/${id}/edit`)}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Level</CardTitle>
            <CardDescription>Current available quantity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-bold tracking-tighter", item.quantity === 0 ? "text-destructive" : item.quantity <= item.minQuantity ? "text-orange-500" : "")}>
                {item.quantity}
              </span>
              <span className="text-xl text-muted-foreground">{item.unit}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Minimum threshold: {item.minQuantity} {item.unit}</p>
            
            {isStaff && (
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => navigate(`/inventory/${id}/checkout`)}>Issue Stock</Button>
                <Button onClick={() => navigate(`/inventory/${id}/restock`)}>Restock</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Item location and supplier information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Location', item.location || '—'], 
              ['Unit', item.unit], 
              ['Supplier', item.supplierName || '—'], 
              ['Contact', item.supplierContact || '—'], 
              ['Unit Cost', item.unitCost ? `₹${item.unitCost}` : '—']
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{k}</span>
                <span className="text-sm font-medium">{String(v)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent stock changes for this item.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm border-t sm:border-t-0">No transactions yet.</div>
          ) : (
            <div className="overflow-x-auto border-t sm:border-t-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Before → After</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="hidden md:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant={t.type === 'damage' || t.type === 'write_off' ? 'destructive' : 'default'} className="flex w-fit items-center gap-1">
                          {t.quantity < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                          <span className="capitalize">{t.type}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className={cn('text-right font-mono font-bold', t.quantity < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-500')}>
                        {t.quantity > 0 ? '+' : ''}{t.quantity}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{t.quantityBefore} → {t.quantityAfter}</TableCell>
                      <TableCell className="text-sm">{t.userName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{t.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus } from 'lucide-react'
import type { MaintenanceRecord } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const STATUS_COLOR = { 
  scheduled: 'default', 
  in_progress: 'secondary', 
  completed: 'outline', 
  cancelled: 'destructive' 
} as const

export default function MaintenanceListPage() {
  const { isStaff } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.MAINTENANCE)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as MaintenanceRecord)
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = records.filter(r => {
    const matchSearch = !search || r.machineName.toLowerCase().includes(search.toLowerCase()) || r.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6 container py-6 mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Records</h1>
          <p className="text-muted-foreground mt-1">Track and manage equipment maintenance.</p>
        </div>
        {isStaff && (
          <Button className="shrink-0 gap-2" onClick={() => navigate('/maintenance/new')}>
            <Plus className="h-4 w-4" /> Schedule Maintenance
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search maintenance..." 
            className="pl-9" 
          />
        </div>
        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || '')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {['scheduled','in_progress','completed','cancelled'].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
               <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No records found.</TableCell>
              </TableRow>
            ) : (
              filtered.map(r => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/maintenance/${r.id}`)}>
                  <TableCell className="font-medium">{r.machineName}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.title}</TableCell>
                  <TableCell className="uppercase text-xs tracking-widest text-muted-foreground">{r.type}</TableCell>
                  <TableCell className="font-mono text-xs">{r.scheduledDate}</TableCell>
                  <TableCell className="text-muted-foreground">{r.technician}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLOR[r.status as keyof typeof STATUS_COLOR] || 'default'} className="capitalize">
                      {r.status.replace('_',' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/maintenance/${r.id}`); }}>
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

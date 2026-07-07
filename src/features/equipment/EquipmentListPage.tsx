import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Grid, List, Wrench, CheckCircle, Clock, AlertTriangle, XCircle, Grid2X2 } from 'lucide-react'
import type { Equipment, EquipmentCategory } from '@/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG = {
  available: { label: 'Available', variant: 'default', icon: CheckCircle },
  reserved: { label: 'Reserved', variant: 'secondary', icon: Clock },
  in_use: { label: 'In Use', variant: 'secondary', icon: Wrench },
  under_maintenance: { label: 'Maintenance', variant: 'destructive', icon: AlertTriangle },
  out_of_service: { label: 'Out of Service', variant: 'destructive', icon: XCircle },
  retired: { label: 'Retired', variant: 'outline', icon: XCircle },
} as const

const CATEGORIES: EquipmentCategory[] = ['Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics', 'Other']

export default function EquipmentListPage() {
  const { isStaff } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = equipment.filter(e => {
    const matchSearch = search === '' || e.name.toLowerCase().includes(search.toLowerCase()) || e.machineId.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || e.category === filterCat
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    return matchSearch && matchCat && matchStatus
  })

  return (
    <div className="space-y-6 container py-6 mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machines & Equipment</h1>
          <p className="text-muted-foreground mt-1 max-w-xl">Tier-1 equipment requires a booking. Hand tools go through Tool Checkout.</p>
        </div>
        {isStaff && (
          <Button className="shrink-0 gap-2" onClick={() => navigate('/equipment/new')}>
            <Plus className="h-4 w-4" /> Add Equipment
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search equipment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={filterCat} onValueChange={(val) => setFilterCat(val || '')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || '')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center space-x-1 border rounded-md p-1 bg-muted/50">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => setViewMode('grid')}
          >
            <Grid2X2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-[240px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-24 text-center">
          <CardContent>
            <p className="text-muted-foreground">No equipment found matching your filters.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(e => {
            const sc = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available
            const Icon = sc.icon
            return (
              <Card key={e.id} className="cursor-pointer hover:border-primary/50 transition-colors flex flex-col h-full" onClick={() => navigate(`/equipment/${e.id}`)}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">{e.machineId}</Badge>
                    <Badge variant={sc.variant as any} className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {sc.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl tracking-tight leading-tight">{e.name}</CardTitle>
                  <CardDescription className="uppercase tracking-widest text-xs font-medium">{e.category}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                </CardContent>
                <CardFooter className="pt-0 border-t pt-4 mx-6 px-0 justify-between">
                  <Badge variant={e.requiresTraining ? "secondary" : "default"} className="font-mono text-[10px] uppercase tracking-wider">
                    {e.requiresTraining ? 'Training Req' : 'Open Use'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); navigate(`/bookings/new?machine=${e.id}`) }}>
                    Book &rarr;
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Training</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => {
                const sc = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available
                const Icon = sc.icon
                return (
                  <TableRow key={e.id} className="cursor-pointer group" onClick={() => navigate(`/equipment/${e.id}`)}>
                    <TableCell className="font-mono text-muted-foreground text-xs">{e.machineId}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{e.name}</TableCell>
                    <TableCell className="text-muted-foreground uppercase text-xs">{e.category}</TableCell>
                    <TableCell className="text-muted-foreground">{e.location || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={sc.variant as any} className="flex w-fit items-center gap-1.5 whitespace-nowrap">
                        <Icon className="h-3 w-3" />{sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.requiresTraining ? "secondary" : "default"} className="font-mono text-[10px] uppercase">
                        {e.requiresTraining ? 'Required' : 'Open'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={ev => { ev.stopPropagation(); navigate(`/bookings/new?machine=${e.id}`) }}>
                        Book
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

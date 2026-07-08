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
    <div className="space-y-8 max-w-[1400px] py-8 mx-auto animate-fade-in px-4">
      {/* Header section with gradient */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Machines & Equipment
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-lg">
            Browse our catalog. Tier-1 equipment requires induction and booking.
          </p>
        </div>
        {isStaff && (
          <Button size="lg" className="shrink-0 gap-2 font-bold shadow-md" onClick={() => navigate('/equipment/new')}>
            <Plus className="h-5 w-5" /> Add Equipment
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search equipment by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-background/50 h-11"
          />
        </div>
        
        <Select value={filterCat} onValueChange={(val) => setFilterCat(val || '')}>
          <SelectTrigger className="w-[200px] h-11 bg-background/50">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || '')}>
          <SelectTrigger className="w-[200px] h-11 bg-background/50">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center space-x-1 border border-border rounded-lg p-1 bg-background/30 h-11">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-8 w-8 rounded-md" 
            onClick={() => setViewMode('grid')}
          >
            <Grid2X2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-8 w-8 rounded-md" 
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-[320px] bg-muted/20 border-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-32 text-center bg-card/40 backdrop-blur-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center">
            <Wrench className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-xl text-muted-foreground font-medium">No equipment found matching your filters.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(e => {
            const sc = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available
            const Icon = sc.icon
            return (
              <Card 
                key={e.id} 
                className="group cursor-pointer hover:border-primary/50 hover:shadow-xl transition-all duration-300 flex flex-col h-full bg-card/60 backdrop-blur-sm overflow-hidden" 
                onClick={() => navigate(`/equipment/${e.id}`)}
              >
                {/* Image Placeholder area, but we'll leave it as a gradient for now since there are no images mapped here */}
                <div className="h-2 bg-gradient-to-r from-primary/40 to-primary/10 w-full" />
                
                <CardHeader className="pb-4 pt-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase bg-background/50 backdrop-blur-sm">
                      {e.machineId}
                    </Badge>
                    <Badge variant={sc.variant as any} className="flex items-center gap-1.5 shadow-sm">
                      <Icon className="h-3 w-3" />
                      {sc.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl tracking-tight leading-tight group-hover:text-primary transition-colors">{e.name}</CardTitle>
                  <CardDescription className="uppercase tracking-widest text-xs font-semibold">{e.category}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{e.description || 'No description available.'}</p>
                </CardContent>
                <CardFooter className="pt-0 border-t border-border/50 pt-4 mx-6 px-0 justify-between items-center">
                  <Badge variant={e.requiresTraining ? "secondary" : "default"} className="font-mono text-[10px] uppercase tracking-wider">
                    {e.requiresTraining ? 'Training Req' : 'Open Use'}
                  </Badge>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2" onClick={(ev) => { ev.stopPropagation(); navigate(`/bookings/new?machine=${e.id}`) }}>
                    Book &rarr;
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="bg-card/60 backdrop-blur-sm border-border shadow-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Training</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => {
                const sc = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available
                const Icon = sc.icon
                return (
                  <TableRow key={e.id} className="cursor-pointer group hover:bg-muted/30 transition-colors" onClick={() => navigate(`/equipment/${e.id}`)}>
                    <TableCell className="font-mono text-muted-foreground text-xs">{e.machineId}</TableCell>
                    <TableCell className="font-medium max-w-[240px] truncate text-foreground group-hover:text-primary transition-colors">{e.name}</TableCell>
                    <TableCell className="text-muted-foreground uppercase text-xs font-medium">{e.category}</TableCell>
                    <TableCell className="text-muted-foreground">{e.location || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={sc.variant as any} className="flex w-fit items-center gap-1.5 whitespace-nowrap shadow-sm">
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


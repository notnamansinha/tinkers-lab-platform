import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import type { Equipment } from '@/types'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Wrench, Activity, AlertTriangle } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  'All': 'default',
  'Digital Fabrication': 'destructive',
  'Heavy Duty': 'secondary',
  'Tabletop Power': 'outline',
  'Electronics': 'default',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All')

  // Fetch all equipment
  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment', 'all'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const snap = await getDocs(ref)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 5 * 60 * 1000,
  })

  // Calculate live ticker stats
  const availableCount = equipment.filter(e => e.status === 'available').length
  const inUseCount = equipment.filter(e => e.status === 'in_use' || e.status === 'reserved').length
  const offlineCount = equipment.filter(e => e.status === 'under_maintenance' || e.status === 'out_of_service' || e.status === 'retired').length

  const filteredEquipment = activeCategory === 'All' 
    ? equipment 
    : equipment.filter(e => e.category === activeCategory)

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in flex flex-col gap-8 pb-12">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Equipment Dashboard</h1>
        <p className="text-muted-foreground mt-2">Monitor live status of all machinery in the Tinkers Lab.</p>
      </div>

      {/* Live Ticker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-background/60 backdrop-blur-md border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
            <Wrench className="h-4 w-4 text-signal-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : availableCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for use</p>
          </CardContent>
        </Card>
        <Card className="bg-background/60 backdrop-blur-md border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Use / Reserved</CardTitle>
            <Activity className="h-4 w-4 text-signal-amber animate-pulse-slow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : inUseCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently occupied</p>
          </CardContent>
        </Card>
        <Card className="bg-background/60 backdrop-blur-md border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Maintenance / Offline</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : offlineCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Digital Fabrication', 'Heavy Duty', 'Tabletop Power', 'Electronics'].map(cat => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="rounded-full transition-all"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full rounded-none" />
              <CardHeader className="p-4"><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent className="p-4 pt-0"><Skeleton className="h-4 w-1/2" /></CardContent>
            </Card>
          ))
        ) : filteredEquipment.length === 0 ? (
          <div className="col-span-full py-24 text-center text-muted-foreground">
            <p className="text-lg">No equipment found matching criteria.</p>
          </div>
        ) : (
          filteredEquipment.map(eq => {
            const isAvail = eq.status === 'available'
            const isDown = eq.status === 'under_maintenance' || eq.status === 'out_of_service' || eq.status === 'retired'
            
            // Determine badge variant
            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"
            let badgeText = 'Available'
            if (isDown) {
              badgeVariant = "destructive"
              badgeText = 'Maintenance'
            } else if (eq.status === 'reserved' || eq.status === 'in_use') {
              badgeVariant = "secondary"
              badgeText = 'In Use'
            }

            return (
              <Card 
                key={eq.id} 
                onClick={() => navigate(`/equipment/${eq.id}`)}
                className="group overflow-hidden bg-background/50 backdrop-blur-sm border-border hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer flex flex-col"
              >
                {/* Photo Area */}
                <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {eq.imageUrls?.[0] ? (
                    <img 
                      src={eq.imageUrls[0]} 
                      alt={eq.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="text-muted-foreground/50 text-sm uppercase">No Image</div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant={badgeVariant} className="shadow-sm font-semibold tracking-wide">
                      {badgeText}
                    </Badge>
                  </div>
                </div>

                {/* Info Area */}
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {eq.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 mt-auto flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                    {eq.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ID: {eq.machineId || 'N/A'}
                  </span>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}


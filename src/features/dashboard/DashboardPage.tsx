import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar, Package, Wrench, AlertTriangle,
  ClipboardList, Users, TrendingUp, Clock,
  CheckCircle, XCircle, ChevronRight,
} from 'lucide-react'
import { collection, query, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { cn, todayStr } from '@/lib/utils'
import type { Booking, InventoryItem, Announcement } from '@/types'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import heroBg from '@/assets/hero.png'

function StatCard({
  label, value, icon: Icon, href,
}: {
  label: string; value: number | string; icon: React.ElementType; href?: string
}) {
  const navigate = useNavigate()
  return (
    <Card 
      className={href ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''} 
      onClick={() => href && navigate(href)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { isAdmin, isStaff, profile } = useAuth()
  const navigate = useNavigate()

  // Fetch today's bookings
  const { data: todayBookings = [] } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.BOOKINGS)
      const q = query(ref, where('date', '==', todayStr()), where('status', 'in', ['pending', 'approved']), orderBy('createdAt', 'desc'), limit(20))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    staleTime: 3 * 60 * 1000,
  })

  // Count pending bookings (admin only)
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['bookings', 'pending-count'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.BOOKINGS)
      const q = query(ref, where('status', '==', 'pending'))
      const snap = await getCountFromServer(q)
      return snap.data().count
    },
    enabled: isStaff,
    staleTime: 5 * 60 * 1000,
  })

  // Low stock items
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.INVENTORY)
      const q = query(ref, where('status', 'in', ['low_stock', 'out_of_stock']), orderBy('createdAt', 'desc'), limit(5))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as InventoryItem)
    },
    staleTime: 10 * 60 * 1000,
  })

  // Announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.ANNOUNCEMENTS)
      const q = query(ref, where('isActive', '==', true), orderBy('createdAt', 'desc'), limit(3))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Announcement)
    },
    staleTime: 15 * 60 * 1000,
  })

  const approvedToday = todayBookings.filter(b => b.status === 'approved').length

  return (
    <div className="space-y-12 container py-6 mx-auto animate-fade-in">
      {/* Hero Section - Perception First Design (L1 Impression) */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-black">
        {/* Background Abstract Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Tinkers Lab Workspace" 
            className="w-full h-full object-cover opacity-60 mix-blend-lighten"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
        </div>
        
        <div className="relative z-10 px-8 py-16 md:py-24 lg:px-16 flex flex-col justify-end min-h-[360px]">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white backdrop-blur-md mb-4 w-max">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            System Online
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white max-w-2xl leading-tight font-display">
            Welcome back{profile?.displayName ? `, ${profile.displayName.split(' ')[0]}` : ''}.
          </h1>
          <p className="text-lg md:text-xl text-white/60 mt-4 font-medium max-w-xl">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — The lab is ready for your next project.
          </p>
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map(a => (
            <Alert key={a.id} variant={a.priority === 'urgent' ? 'destructive' : 'default'} className={a.priority === 'urgent' ? "bg-destructive/10" : ""}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{a.title}</AlertTitle>
              <AlertDescription>{a.body}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Bookings Today" value={todayBookings.length} icon={Calendar} href="/bookings" />
        <StatCard label="Approved Today" value={approvedToday} icon={CheckCircle} href="/bookings" />
        {isStaff && <StatCard label="Pending Approvals" value={pendingCount} icon={Clock} href={isAdmin ? '/admin/bookings' : '/bookings'} />}
        <StatCard label="Low Stock Alerts" value={lowStockItems.length} icon={Package} href="/inventory" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Book Equipment', href: '/bookings/new', icon: Calendar, variant: 'default' },
          { label: 'Register Project', href: '/projects/new', icon: ClipboardList, variant: 'secondary' },
          { label: 'Tool Checkout', href: '/checkout', icon: Package, variant: 'outline' },
          { label: 'Report Issue', href: '/report-issue', icon: AlertTriangle, variant: 'destructive' },
        ].map(action => (
          <Button
            key={action.href}
            variant={action.variant as any}
            className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-center w-full"
            onClick={() => navigate(action.href)}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's bookings table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>Upcoming equipment reservations for today.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => navigate('/bookings')}>
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {todayBookings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No bookings scheduled for today — every machine is free.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayBookings.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.machineName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{b.startTime}–{b.endTime}</TableCell>
                      <TableCell className="truncate max-w-[150px]">{b.userName || b.userEmail}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'approved' ? 'default' : b.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                          {b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card className="border-orange-200 dark:border-orange-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50/50 dark:bg-orange-950/20">
            <div className="space-y-1">
              <CardTitle className="text-orange-800 dark:text-orange-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Low Stock
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-orange-700 dark:text-orange-500" onClick={() => navigate('/inventory')}>
              Manage
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Inventory levels are healthy.</div>
            ) : (
              <div className="divide-y divide-border">
                {lowStockItems.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/inventory/${item.id}`)}>
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold font-mono', item.quantity === 0 ? 'text-destructive' : 'text-orange-500')}>
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">min: {item.minQuantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

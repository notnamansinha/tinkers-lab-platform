import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar, Package, Wrench, AlertTriangle,
  ClipboardList, Users, TrendingUp, Clock,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react'
import { collection, query, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { formatRelativeTime, todayStr } from '@/lib/utils'
import type { Booking, InventoryItem, Announcement } from '@/types'

// Stat card component
function StatCard({
  label, value, icon: Icon, color, href,
}: {
  label: string; value: number | string; icon: React.ElementType; color: string; href?: string
}) {
  const content = (
    <div className={`rounded-lg border bg-card p-5 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`text-3xl font-display font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-md ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-500', '-100')}`}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </div>
  )
  return href ? <Link to={href}>{content}</Link> : content
}

export default function DashboardPage() {
  const { isAdmin, isStaff, profile } = useAuth()

  // Fetch today's bookings (narrow query – only today)
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
  const pendingToday = todayBookings.filter(b => b.status === 'pending').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-accent">Innovation & Tinkering Lab</p>
        <h1 className="text-2xl font-display font-bold mt-1">
          Welcome back{profile?.displayName ? `, ${profile.displayName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map(a => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-md border-l-4 text-sm ${
              a.priority === 'urgent' ? 'bg-red-50 border-red-500 text-red-800' :
              a.priority === 'high' ? 'bg-orange-50 border-orange-500 text-orange-800' :
              'bg-blue-50 border-blue-400 text-blue-800'
            }`}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{a.title}</span>
                {' — '}
                <span>{a.body}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Bookings today" value={todayBookings.length} icon={Calendar} color="text-blue-600" href="/bookings" />
        <StatCard label="Approved today" value={approvedToday} icon={CheckCircle} color="text-green-600" href="/bookings" />
        {isStaff && <StatCard label="Pending approval" value={pendingCount} icon={Clock} color="text-orange-600" href={isAdmin ? '/admin/bookings' : '/bookings'} />}
        <StatCard label="Low stock alerts" value={lowStockItems.length} icon={Package} color="text-red-600" href="/inventory" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Book Equipment', href: '/bookings/new', icon: Calendar, color: 'bg-tl-ink text-white hover:bg-tl-ink/90' },
          { label: 'Register Project', href: '/projects/new', icon: ClipboardList, color: 'bg-tl-green text-white hover:bg-tl-green/90' },
          { label: 'Tool Checkout', href: '/checkout', icon: Package, color: 'bg-tl-orange text-white hover:bg-tl-orange/90' },
          { label: 'Report Issue', href: '/report-issue', icon: AlertTriangle, color: 'bg-red-600 text-white hover:bg-red-700' },
        ].map(action => (
          <Link
            key={action.href}
            to={action.href}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${action.color}`}
          >
            <action.icon size={16} />
            {action.label}
          </Link>
        ))}
      </div>

      {/* Today's bookings table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-display font-semibold">Today's Bookings</h2>
          <Link to="/bookings" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {todayBookings.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No bookings scheduled for today — every machine is free.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Machine</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Booked by</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {todayBookings.map(b => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{b.machineName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{b.startTime}–{b.endTime}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-40">{b.userName || b.userEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        b.status === 'approved' ? 'bg-green-100 text-green-700' :
                        b.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {b.status === 'approved' ? <CheckCircle size={10} /> : b.status === 'pending' ? <Clock size={10} /> : <XCircle size={10} />}
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-200 flex items-center justify-between">
            <h2 className="font-display font-semibold text-orange-800 flex items-center gap-2">
              <AlertTriangle size={16} /> Low Stock Alerts
            </h2>
            <Link to="/inventory" className="text-xs text-orange-700 hover:underline">Manage →</Link>
          </div>
          <div className="divide-y divide-orange-100">
            {lowStockItems.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900">{item.name}</p>
                  <p className="text-xs text-orange-600">{item.category}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-mono font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                    {item.quantity} {item.unit}
                  </span>
                  <p className="text-xs text-orange-500">min: {item.minQuantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

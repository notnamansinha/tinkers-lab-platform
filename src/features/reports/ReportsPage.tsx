import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, getCountFromServer, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { BarChart3, Calendar, Package, FolderKanban, Users } from 'lucide-react'

const COLORS = ['#1F5F3F', '#E85D26', '#3b82f6', '#f59e0b', '#8b5cf6']

export default function ReportsPage() {
  const { isStaff } = useAuth()

  const { data: bookingsByStatus } = useQuery({
    queryKey: ['reports', 'bookings-status'],
    queryFn: async () => {
      const statuses = ['pending', 'approved', 'rejected', 'cancelled', 'completed']
      const counts = await Promise.all(statuses.map(async s => {
        const ref = collection(db, COLLECTIONS.BOOKINGS)
        const q = query(ref, where('status', '==', s))
        const snap = await getCountFromServer(q)
        return { name: s, value: snap.data().count }
      }))
      return counts.filter(c => c.value > 0)
    },
    enabled: isStaff,
    staleTime: 30 * 60 * 1000,
  })

  const { data: inventoryByStatus } = useQuery({
    queryKey: ['reports', 'inventory-status'],
    queryFn: async () => {
      const statuses = ['in_stock', 'low_stock', 'out_of_stock']
      const counts = await Promise.all(statuses.map(async s => {
        const ref = collection(db, COLLECTIONS.INVENTORY)
        const q = query(ref, where('status', '==', s))
        const snap = await getCountFromServer(q)
        return { name: s.replace('_',' '), value: snap.data().count }
      }))
      return counts.filter(c => c.value > 0)
    },
    enabled: isStaff,
    staleTime: 30 * 60 * 1000,
  })

  const { data: projectsByStatus } = useQuery({
    queryKey: ['reports', 'projects-status'],
    queryFn: async () => {
      const statuses = ['pending', 'active', 'completed', 'on_hold', 'rejected']
      const counts = await Promise.all(statuses.map(async s => {
        const ref = collection(db, COLLECTIONS.PROJECTS)
        const q = query(ref, where('status', '==', s))
        const snap = await getCountFromServer(q)
        return { name: s.replace('_',' '), value: snap.data().count }
      }))
      return counts.filter(c => c.value > 0)
    },
    enabled: isStaff,
    staleTime: 30 * 60 * 1000,
  })

  if (!isStaff) return <div className="py-16 text-center text-muted-foreground">Staff access required to view reports.</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-accent">Analytics</p>
        <h1 className="text-2xl font-display font-bold mt-1">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm">Lab utilization metrics. Data cached for 30 minutes to minimize Firestore reads.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bookings by status */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><Calendar size={16} /> Bookings by Status</h2>
          {bookingsByStatus && bookingsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={bookingsByStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {bookingsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No booking data</div>}
        </div>

        {/* Inventory health */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><Package size={16} /> Inventory Health</h2>
          {inventoryByStatus && inventoryByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={inventoryByStatus}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1F5F3F" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No inventory data</div>}
        </div>

        {/* Projects */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><FolderKanban size={16} /> Projects by Status</h2>
          {projectsByStatus && projectsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projectsByStatus}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#E85D26" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No project data</div>}
        </div>

        {/* Free tier notice */}
        <div className="rounded-lg border bg-card p-5 flex flex-col justify-center">
          <h2 className="font-display font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} /> Free Tier Status</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This platform is optimized for Firebase's Spark (free) tier:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ['Firestore reads', '50,000/day limit — aggressive caching applied'],
              ['Writes', '20,000/day limit — batched where possible'],
              ['Auth', 'Google Auth, Email/Password — unlimited'],
              ['Hosting', '10 GB/month bandwidth'],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>{k}:</strong> {v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

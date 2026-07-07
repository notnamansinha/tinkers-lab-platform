import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCountFromServer, collection, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Users, Calendar, Package, FolderKanban, AlertTriangle, Bell, ShieldCheck } from 'lucide-react'

function StatCard({ label, value, icon: Icon, href, color }: { label: string; value: number | string; icon: React.ElementType; href: string; color: string }) {
  return (
    <Link to={href} className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`text-3xl font-display font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-md ${color.replace('text-','bg-').replace('-600','-100').replace('-500','-100')}`}>
          <Icon size={20} className={color} />
        </div>
      </div>
      <p className="text-xs text-primary mt-3 hover:underline">Manage →</p>
    </Link>
  )
}

function useCount(collectionName: string, field?: string, value?: string) {
  return useQuery({
    queryKey: ['count', collectionName, field, value],
    queryFn: async () => {
      const ref = collection(db, collectionName)
      const q = field ? query(ref, where(field, '==', value)) : ref
      const snap = await getCountFromServer(q as any)
      return snap.data().count
    },
    staleTime: 10 * 60 * 1000,
  })
}

export default function AdminDashboard() {
  const { data: totalUsers = 0 } = useCount(COLLECTIONS.USERS)
  const { data: pendingBookings = 0 } = useCount(COLLECTIONS.BOOKINGS, 'status', 'pending')
  const { data: totalProjects = 0 } = useCount(COLLECTIONS.PROJECTS)
  const { data: openIssues = 0 } = useCount(COLLECTIONS.ISSUES, 'status', 'open')
  const { data: lowStock = 0 } = useCount(COLLECTIONS.INVENTORY, 'status', 'low_stock')
  const { data: outOfStock = 0 } = useCount(COLLECTIONS.INVENTORY, 'status', 'out_of_stock')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary text-primary-foreground rounded-md"><ShieldCheck size={20} /></div>
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Admin Panel</p>
          <h1 className="text-2xl font-display font-bold mt-0.5">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Manage all platform data. All data shown latest to oldest.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={totalUsers} icon={Users} href="/admin/users" color="text-blue-600" />
        <StatCard label="Pending Bookings" value={pendingBookings} icon={Calendar} href="/admin/bookings" color="text-orange-600" />
        <StatCard label="Total Projects" value={totalProjects} icon={FolderKanban} href="/admin/projects" color="text-tl-green" />
        <StatCard label="Open Issues" value={openIssues} icon={AlertTriangle} href="/admin/issues" color="text-red-600" />
        <StatCard label="Low Stock Items" value={lowStock + outOfStock} icon={Package} href="/admin/inventory" color="text-yellow-600" />
        <StatCard label="Announcements" value="Manage" icon={Bell} href="/admin/announcements" color="text-purple-600" />
      </div>

      {/* Quick links */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-display font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Approve Bookings', href: '/admin/bookings', color: 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100' },
            { label: 'Review Projects', href: '/admin/projects', color: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' },
            { label: 'Manage Users', href: '/admin/users', color: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100' },
            { label: 'Resolve Issues', href: '/admin/issues', color: 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100' },
          ].map(a => (
            <Link key={a.href} to={a.href} className={`border rounded-md px-4 py-3 text-sm font-medium text-center transition-colors ${a.color}`}>{a.label}</Link>
          ))}
        </div>
      </div>
    </div>
  )
}

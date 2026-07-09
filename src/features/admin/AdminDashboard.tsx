import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCountFromServer, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { getAllActiveCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { EQUIPMENT_SEED } from '@/../scripts/seedEquipment'
import { Users, Calendar, Package, FolderKanban, AlertTriangle, Bell, ShieldCheck, Database, CheckCircle2 } from 'lucide-react'

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
  const { data: totalUsers = 0 }   = useCount(COLLECTIONS.USERS)
  const { data: totalBookings = 0 } = useCount(COLLECTIONS.BOOKINGS)
  const { data: totalProjects = 0 } = useCount(COLLECTIONS.PROJECTS)
  const { data: openIssues = 0 }    = useCount(COLLECTIONS.ISSUES, 'status', 'open')
  const { data: lowStock = 0 }      = useCount(COLLECTIONS.INVENTORY, 'status', 'low_stock')
  const { data: outOfStock = 0 }    = useCount(COLLECTIONS.INVENTORY, 'status', 'out_of_stock')
  const { data: totalEquipment = 0 } = useCount(COLLECTIONS.EQUIPMENT)

  const { data: allCheckouts = [] } = useQuery({
    queryKey: ['admin', 'checkouts', 'all'],
    queryFn: () => getAllActiveCheckouts(),
    staleTime: 2 * 60 * 1000,
  })
  const activeCheckoutCount = allCheckouts.filter(c => !c.returnedAt).length
  const overdueCount        = allCheckouts.filter(isCheckoutOverdue).length

  const [isSeeding, setIsSeeding] = useState(false)
  const [seeded, setSeeded]       = useState(false)

  const handleSeed = async () => {
    if (!window.confirm(`Seed ${EQUIPMENT_SEED.length} equipment items to Firestore? This will ADD items (won't overwrite existing).`)) return
    setIsSeeding(true)
    try {
      const col = collection(db, COLLECTIONS.EQUIPMENT)
      let count = 0
      for (const item of EQUIPMENT_SEED) {
        await addDoc(col, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        count++
      }
      setSeeded(true)
      alert(`✅ ${count} items seeded successfully!`)
    } catch (e: any) {
      alert('Seed failed: ' + e.message)
    } finally {
      setIsSeeding(false)
    }
  }

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
        <StatCard label="Total Users"       value={totalUsers}           icon={Users}          href="/admin/users"      color="text-blue-600" />
        <StatCard label="Total Bookings"    value={totalBookings}        icon={Calendar}       href="/admin/bookings"   color="text-tl-green" />
        <StatCard label="Total Projects"    value={totalProjects}        icon={FolderKanban}   href="/admin/projects"   color="text-tl-green" />
        <StatCard label="Open Issues"       value={openIssues}           icon={AlertTriangle}  href="/admin/issues"     color="text-red-600" />
        <StatCard label="Low/Out of Stock"  value={lowStock + outOfStock} icon={Package}       href="/admin/inventory" color="text-yellow-600" />
        <StatCard label="Announcements"     value="Manage"               icon={Bell}           href="/admin/announcements" color="text-purple-600" />
      </div>

      {/* Checkouts overview */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="font-display font-semibold">Tool Checkout Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <p className="text-2xl font-bold text-foreground">{activeCheckoutCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Checkouts</p>
          </div>
          <div className={`text-center p-3 rounded-xl ${overdueCount > 0 ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/30'}`}>
            <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{overdueCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Overdue</p>
          </div>
          <Link to="/checkout/history" className="text-center p-3 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors">
            <p className="text-2xl font-bold text-primary">{allCheckouts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total (incl. returned)</p>
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-display font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Review Bookings',  href: '/admin/bookings',      color: 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100 dark:bg-orange-950/30 dark:border-orange-900/40 dark:text-orange-400' },
            { label: 'Review Projects',  href: '/admin/projects',      color: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-900/40 dark:text-green-400' },
            { label: 'Manage Users',     href: '/admin/users',         color: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40 dark:text-blue-400' },
            { label: 'Resolve Issues',   href: '/admin/issues',        color: 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-400' },
            { label: 'Checkout History', href: '/checkout/history',    color: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-400' },
            { label: 'Reports',          href: '/reports',             color: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/30 dark:border-purple-900/40 dark:text-purple-400' },
          ].map(a => (
            <Link key={a.href} to={a.href} className={`border rounded-md px-4 py-3 text-sm font-medium text-center transition-colors ${a.color}`}>{a.label}</Link>
          ))}
        </div>
      </div>

      {/* Database setup — seed equipment */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-muted-foreground" />
          <h2 className="font-display font-semibold">Database Setup</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Equipment database currently has <strong>{totalEquipment}</strong> items.
          {totalEquipment === 0 && ' Seed the full equipment list from the spec to get started.'}
        </p>
        <button
          onClick={handleSeed}
          disabled={isSeeding || seeded}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            seeded
              ? 'bg-green-600/10 text-green-600 border border-green-600/30 cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
          }`}
        >
          {seeded
            ? <><CheckCircle2 size={15} /> Seeded!</>
            : isSeeding
              ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Seeding…</>
              : <><Database size={15} /> Seed {EQUIPMENT_SEED.length} Equipment Items</>
          }
        </button>
      </div>
    </div>
  )
}

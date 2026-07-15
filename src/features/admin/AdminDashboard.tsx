import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCountFromServer, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { getAllActiveCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { EQUIPMENT_SEED } from '@/../scripts/seedEquipment'
import { Users, Calendar, Package, FolderKanban, AlertTriangle, Bell, ShieldCheck, Database, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataPanel } from '@/components/common/DataPanel'
import { KpiTile } from '@/components/common/KpiTile'

function useCount(collectionName: string, field?: string, value?: string) {
  return useQuery({
    queryKey: ['count', collectionName, field, value],
    queryFn: async () => {
      const ref = collection(db, collectionName)
      const q = field ? query(ref, where(field, '==', value)) : ref
      const snap = await getCountFromServer(q as ReturnType<typeof collection>)
      return snap.data().count
    },
    staleTime: 10 * 60 * 1000,
  })
}

export default function AdminDashboard() {
  const { data: totalUsers = 0 } = useCount(COLLECTIONS.USERS)
  const { data: totalBookings = 0 } = useCount(COLLECTIONS.BOOKINGS)
  const { data: totalProjects = 0 } = useCount(COLLECTIONS.PROJECTS)
  const { data: openIssues = 0 } = useCount(COLLECTIONS.ISSUES, 'status', 'open')
  const { data: lowStock = 0 } = useCount(COLLECTIONS.INVENTORY, 'status', 'low_stock')
  const { data: outOfStock = 0 } = useCount(COLLECTIONS.INVENTORY, 'status', 'out_of_stock')
  const { data: totalEquipment = 0 } = useCount(COLLECTIONS.EQUIPMENT)

  const { data: allCheckouts = [] } = useQuery({
    queryKey: ['admin', 'checkouts', 'all'],
    queryFn: () => getAllActiveCheckouts(),
    staleTime: 2 * 60 * 1000,
  })
  const activeCheckoutCount = allCheckouts.filter(c => !c.returnedAt).length
  const overdueCount = allCheckouts.filter(isCheckoutOverdue).length

  const [isSeeding, setIsSeeding] = useState(false)
  const [seeded, setSeeded] = useState(false)

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
    } catch (e: unknown) {
      alert('Seed failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Admin Hub"
        description="Manage all platform data. All data shown latest to oldest."
        action={
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <ShieldCheck size={22} className="text-pink" />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <KpiTile label="Total Users" value={totalUsers} icon={Users} href="/admin/users" color="#DDF237" footer="Manage →" />
        <KpiTile label="Total Bookings" value={totalBookings} icon={Calendar} href="/admin/bookings" color="#FFF4BE" footer="Manage →" />
        <KpiTile label="Total Projects" value={totalProjects} icon={FolderKanban} href="/admin/projects" color="#E1D7A8" footer="Manage →" />
        <KpiTile label="Open Issues" value={openIssues} icon={AlertTriangle} href="/admin/issues" color="#EC68D8" footer="Manage →" />
        <KpiTile label="Low/Out of Stock" value={lowStock + outOfStock} icon={Package} href="/admin/inventory" color="#FFB13F" footer="Manage →" />
        <KpiTile label="Announcements" value="Manage" icon={Bell} href="/admin/announcements" color="#514AF1" textColor="light" footer="Manage →" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <DataPanel title="Tool Checkout Status">
          <div className="grid grid-cols-3 gap-4">
            <div className="tl-kpi-tile" style={{ backgroundColor: '#DDF237' }}>
              <span className="tl-kpi-label text-[#56779D]">Active</span>
              <span className="tl-kpi-value text-[#56779D]">{activeCheckoutCount}</span>
            </div>
            <div className="tl-kpi-tile" style={{ backgroundColor: overdueCount > 0 ? '#EC68D8' : '#191919' }}>
              <span className={overdueCount > 0 ? 'tl-kpi-label text-white' : 'tl-kpi-label text-[#7D9FC2]'}>Overdue</span>
              <span className={overdueCount > 0 ? 'tl-kpi-value text-white' : 'tl-kpi-value text-white'}>{overdueCount}</span>
            </div>
            <Link to="/checkout/history" className="tl-kpi-tile group" style={{ backgroundColor: '#514AF1' }}>
              <span className="tl-kpi-label text-[#7D9FC2]">Total</span>
              <span className="tl-kpi-value text-[#56779D]">{allCheckouts.length}</span>
              <span className="text-[11px] font-bold text-[#7D9FC2] uppercase tracking-wider group-hover:text-white/70">View →</span>
            </Link>
          </div>
        </DataPanel>

        <DataPanel title="Database Setup">
          <div className="flex items-center gap-2 mb-3">
            <Database size={18} className="text-[#7D9FC2]" />
            <p className="text-[#7D9FC2] text-sm font-medium">
              Equipment database has <strong className="text-[#56779D]">{totalEquipment}</strong> items.
              {totalEquipment === 0 && ' Seed the full equipment list to get started.'}
            </p>
          </div>
          <button
            onClick={handleSeed}
            disabled={isSeeding || seeded}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wide transition-all ${
              seeded
                ? 'bg-lime text-[#56779D] cursor-not-allowed'
                : 'tl-pill-button'
            }`}
          >
            {seeded ? (
              <><CheckCircle2 size={15} /> Seeded!</>
            ) : isSeeding ? (
              <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Seeding…</>
            ) : (
              <><Database size={15} /> Seed {EQUIPMENT_SEED.length} Items</>
            )}
          </button>
        </DataPanel>
      </div>

      <DataPanel title="Quick Actions">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Review Bookings', href: '/admin/bookings', bg: '#FFB13F' },
            { label: 'Review Projects', href: '/admin/projects', bg: '#DDF237' },
            { label: 'Manage Users', href: '/admin/users', bg: '#514AF1', fg: '#fff' },
            { label: 'Resolve Issues', href: '/admin/issues', bg: '#EC68D8' },
            { label: 'Checkout History', href: '/checkout/history', bg: '#191919', fg: '#fff' },
            { label: 'Reports', href: '/reports', bg: '#FFF4BE' },
          ].map(a => (
            <Link
              key={a.href}
              to={a.href}
              className="rounded-[16px] px-4 py-4 text-sm font-bold text-center transition-all hover:brightness-110 active:scale-[0.98] border-2 border-white/10"
              style={{ backgroundColor: a.bg, color: a.fg ?? '#000' }}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </DataPanel>
    </div>
  )
}

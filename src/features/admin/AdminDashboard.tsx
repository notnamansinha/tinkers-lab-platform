import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCountFromServer, collection, collectionGroup, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'sonner'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { getAllActiveCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { EQUIPMENT_SEED } from '@/../scripts/seedEquipment'
import { Users, Calendar, Package, FolderKanban, AlertTriangle, Bell, ShieldCheck, Database, CheckCircle2, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataPanel } from '@/components/common/DataPanel'
import { KpiTile } from '@/components/common/KpiTile'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

function useCount(collectionName: string, field?: string, value?: string, group = false) {
  return useQuery({
    queryKey: ['count', collectionName, field, value, group],
    queryFn: async () => {
      const ref = group ? collectionGroup(db, collectionName) : collection(db, collectionName)
      const q    = field ? query(ref, where(field, '==', value)) : ref
      const snap = await getCountFromServer(q as ReturnType<typeof collection>)
      return snap.data().count
    },
    staleTime: 10 * 60 * 1000,
  })
}

export default function AdminDashboard() {
  const { data: totalUsers     = 0 } = useCount(COLLECTIONS.USERS)
  // Bookings now live under projects/{projectId}/bookings — count via collection group
  const { data: totalBookings  = 0 } = useCount('bookings', undefined, undefined, true)
  const { data: totalProjects  = 0 } = useCount(COLLECTIONS.PROJECTS)
  const { data: openIssues     = 0 } = useCount(COLLECTIONS.ISSUES,    'status', 'open')
  const { data: lowStock       = 0 } = useCount(COLLECTIONS.INVENTORY, 'status', 'low_stock')
  const { data: outOfStock     = 0 } = useCount(COLLECTIONS.INVENTORY, 'status', 'out_of_stock')
  const { data: totalEquipment = 0 } = useCount(COLLECTIONS.EQUIPMENT)

  const { data: allCheckouts = [] } = useQuery({
    queryKey: ['admin', 'checkouts', 'all'],
    queryFn: () => getAllActiveCheckouts(),
    staleTime: 2 * 60 * 1000,
  })
  const activeCheckoutCount = allCheckouts.filter(c => !c.returnedAt).length
  const overdueCount        = allCheckouts.filter(isCheckoutOverdue).length

  const [isSeeding,     setIsSeeding]     = useState(false)
  const [seeded,        setSeeded]        = useState(false)
  const [seedDialogOpen, setSeedDialogOpen] = useState(false)

  const handleSeed = async () => {
    setSeedDialogOpen(false)
    setIsSeeding(true)
    try {
      const col = collection(db, COLLECTIONS.EQUIPMENT)
      let count = 0
      for (const item of EQUIPMENT_SEED) {
        // Use machineId as the document ID so re-runs are idempotent.
        // setDoc with merge:true skips already-seeded items without overwriting manual edits.
        await setDoc(doc(col, item.machineId), { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
        count++
      }
      setSeeded(true)
      toast.success(`${count} items seeded successfully!`)
    } catch (e: unknown) {
      toast.error('Seed failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] min-w-0 animate-fade-in">
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

      {/* ── KPI tiles ─────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-3 sm:gap-4">
        <KpiTile label="Total Users"      value={totalUsers}              icon={Users}         href="/admin/users"         color="#E0EF4A" footer="Manage →" />
        <KpiTile label="Total Bookings"   value={totalBookings}           icon={Calendar}      href="/admin/bookings"      color="#FFF4BE" footer="Manage →" />
        <KpiTile label="Total Projects"   value={totalProjects}           icon={FolderKanban}  href="/admin/projects"      color="#E1D7A8" footer="Manage →" />
        <KpiTile label="Open Issues"      value={openIssues}              icon={AlertTriangle} href="/admin/issues"        color="#EC68D8" footer="Manage →" />
        <KpiTile label="Low/Out of Stock" value={lowStock + outOfStock}   icon={Package}       href="/admin/inventory"     color="#FFB13F" footer="Manage →" />
        <KpiTile label="Announcements"    value="Manage"                  icon={Bell}          href="/admin/announcements" color="#A9957A" footer="Manage →" />
      </div>

      {/* ── Quick Actions (pinned above detail panels) ───────────────────── */}
      <DataPanel title="Quick Actions" className="mb-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
          {[
            { label: 'Review Bookings',  href: '/admin/bookings',   bg: '#FFB13F' },
            { label: 'Review Projects',  href: '/admin/projects',   bg: '#E0EF4A' },
            { label: 'Manage Users',     href: '/admin/users',      bg: '#514AF1', fg: '#fff' },
            { label: 'Resolve Issues',   href: '/admin/issues',     bg: '#EC68D8' },
            { label: 'Manage Equipment', href: '/admin/equipment',  bg: '#191919', fg: '#fff' },
            { label: 'Checkout History', href: '/checkout/history', bg: '#A9957A' },
            { label: 'Reports',          href: '/reports',          bg: '#FFF4BE' },
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

      {/* ── Checkout + Seed panels ────────────────────────────────────────── */}
      <div className="mb-6 grid min-w-0 gap-4 xl:grid-cols-2 sm:gap-5">
        <DataPanel title="Tool Checkout Status">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="tl-kpi-tile" style={{ backgroundColor: '#E0EF4A' }}>
               <span className="tl-kpi-label text-black/60">Active</span>
               <span className="tl-kpi-value text-black">{activeCheckoutCount}</span>
            </div>
            <div className="tl-kpi-tile" style={{ backgroundColor: overdueCount > 0 ? '#EC68D8' : '#191919' }}>
               <span className={overdueCount > 0 ? 'tl-kpi-label text-black/60' : 'tl-kpi-label text-white/60'}>Overdue</span>
               <span className={overdueCount > 0 ? 'tl-kpi-value text-black' : 'tl-kpi-value text-white'}>{overdueCount}</span>
            </div>
            <Link to="/checkout/history" className="tl-kpi-tile group" style={{ backgroundColor: '#514AF1' }}>
               <span className="tl-kpi-label text-white/60">Total</span>
               <span className="tl-kpi-value text-white">{allCheckouts.length}</span>
               <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 group-hover:text-white/70">View →</span>
            </Link>
          </div>
        </DataPanel>

        <DataPanel title="Database Setup">
          <div className="flex items-center gap-2 mb-4">
             <Database size={18} className="text-white/60" />
             <p className="text-sm font-medium text-white/60">
               Equipment database has <strong className="text-white">{totalEquipment}</strong> items.
              {totalEquipment === 0 && ' Seed the full equipment list to get started.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSeedDialogOpen(true)}
              disabled={isSeeding || seeded}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wide transition-all ${
                seeded
                   ? 'bg-lime text-black cursor-not-allowed'
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
            <Link
              to="/admin/equipment"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wide border-2 border-white/15 bg-white/5 text-white transition-all hover:border-white/30 hover:bg-white/10"
            >
              <Wrench size={15} /> Manage Equipment
            </Link>
          </div>
        </DataPanel>
      </div>



      <ConfirmDialog
        open={seedDialogOpen}
        onOpenChange={setSeedDialogOpen}
        title="Seed Equipment Database"
        description={`This will add ${EQUIPMENT_SEED.length} equipment items to Firestore. Items won't overwrite existing ones.`}
        onConfirm={handleSeed}
        confirmLabel={`Seed ${EQUIPMENT_SEED.length} Items`}
        loading={isSeeding}
      />
    </div>
  )
}

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, getCountFromServer, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { getAllActiveCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BarChart3, Package, AlertTriangle, Layers3, Calendar, TrendingUp } from 'lucide-react'
import type { Booking, ToolCheckout, Equipment } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// ── Colour palette ────────────────────────────────────────────────────────────
const PIE_COLORS   = ['#0A84FF', '#30D158', '#FF9500', '#FF453A', '#BF5AF2']
const BAR_COLOR    = 'hsl(var(--primary))'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: {
  label: string; value: React.ReactNode; icon: React.ReactNode; color: string; sub?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
            <span style={{ color }}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { isStaff } = useAuth()
  const [tab, setTab] = useState<'overview' | 'consumables' | 'utilisation' | 'tools'>('overview')

  // ── 1. Booking counts by status ──────────────────────────────────────────
  const { data: bookingsByStatus = [] } = useQuery({
    queryKey: ['reports', 'bookings-status'],
    queryFn: async () => {
      const statuses = ['approved', 'rejected', 'cancelled', 'completed']
      const counts = await Promise.all(statuses.map(async s => {
        const q = query(collection(db, COLLECTIONS.BOOKINGS), where('status', '==', s))
        return { name: s, value: (await getCountFromServer(q)).data().count }
      }))
      return counts.filter(c => c.value > 0)
    },
    enabled: isStaff,
    staleTime: 10 * 60 * 1000,
  })

  // ── 2. Bookings per machine (utilisation) ─────────────────────────────────
  const { data: bookingsPerMachine = [] } = useQuery({
    queryKey: ['reports', 'bookings-per-machine'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, COLLECTIONS.BOOKINGS), orderBy('createdAt', 'desc'), limit(200)))
      const bookings = snap.docs.map(d => d.data() as Booking)
      const counts: Record<string, { name: string; count: number }> = {}
      for (const b of bookings) {
        const key = b.machineName || b.machineId
        counts[key] = counts[key]
          ? { ...counts[key], count: counts[key].count + 1 }
          : { name: key, count: 1 }
      }
      return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10)
    },
    enabled: isStaff,
    staleTime: 10 * 60 * 1000,
  })

  // ── 3. Tool checkout activity ─────────────────────────────────────────────
  const { data: allCheckouts = [] } = useQuery({
    queryKey: ['reports', 'all-checkouts'],
    queryFn: () => getAllActiveCheckouts(),
    enabled: isStaff,
    staleTime: 5 * 60 * 1000,
  })

  const overdueCheckouts = allCheckouts.filter(isCheckoutOverdue)

  // Checkouts per category
  const checkoutsByCategory = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of allCheckouts) {
      counts[c.toolCategory] = (counts[c.toolCategory] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [allCheckouts])

  // Off-premises vs in-lab
  const offPremises = allCheckouts.filter(c => c.locationOfUse === 'taking_outside' && !c.returnedAt).length
  const inLab       = allCheckouts.filter(c => c.locationOfUse === 'in_lab'         && !c.returnedAt).length

  // ── 4. Filament/material consumables (from bookings) ─────────────────────
  const { data: consumableBookings = [] } = useQuery({
    queryKey: ['reports', 'consumables'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, COLLECTIONS.BOOKINGS), orderBy('createdAt', 'desc'), limit(300)))
      return snap.docs.map(d => d.data() as Booking).filter(b => !!b.consumables)
    },
    enabled: isStaff,
    staleTime: 15 * 60 * 1000,
  })

  // Aggregate filament usage by type
  const filamentByType = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of consumableBookings) {
      if (b.consumables?.filamentType && b.consumables?.filamentQuantityGrams) {
        const t = b.consumables.filamentType
        map[t] = (map[t] ?? 0) + b.consumables.filamentQuantityGrams
      }
    }
    return Object.entries(map)
      .map(([name, grams]) => ({ name, grams }))
      .sort((a, b) => b.grams - a.grams)
  }, [consumableBookings])

  const totalFilamentGrams = filamentByType.reduce((s, e) => s + e.grams, 0)

  // Material usage (laser cutter)
  const materialByType = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of consumableBookings) {
      if (b.consumables?.materialType) {
        const t = b.consumables.materialType
        map[t] = (map[t] ?? 0) + 1
      }
    }
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [consumableBookings])

  // ── 5. Projects by status ────────────────────────────────────────────────
  const { data: projectsByStatus = [] } = useQuery({
    queryKey: ['reports', 'projects-status'],
    queryFn: async () => {
      const statuses = ['pending', 'active', 'completed', 'on_hold', 'rejected']
      const counts = await Promise.all(statuses.map(async s => {
        const q = query(collection(db, COLLECTIONS.PROJECTS), where('status', '==', s))
        return { name: s.replace('_', ' '), value: (await getCountFromServer(q)).data().count }
      }))
      return counts.filter(c => c.value > 0)
    },
    enabled: isStaff,
    staleTime: 10 * 60 * 1000,
  })

  // ── 6. Equipment health ──────────────────────────────────────────────────
  const { data: equipmentHealth = [] } = useQuery({
    queryKey: ['reports', 'equipment-health'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, COLLECTIONS.EQUIPMENT))
      const eqs  = snap.docs.map(d => d.data() as Equipment)
      const statuses = ['available', 'in_use', 'reserved', 'under_maintenance', 'out_of_service', 'retired']
      return statuses.map(s => ({
        name: s.replace('_', ' '),
        value: eqs.filter(e => e.status === s).length,
      })).filter(e => e.value > 0)
    },
    enabled: isStaff,
    staleTime: 5 * 60 * 1000,
  })

  if (!isStaff) {
    return (
      <div className="container py-12 mx-auto text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">Staff access only.</p>
      </div>
    )
  }

  const TABS = [
    { key: 'overview',     label: 'Overview' },
    { key: 'utilisation',  label: 'Machine Utilisation' },
    { key: 'tools',        label: 'Tool Checkouts' },
    { key: 'consumables',  label: 'Consumables' },
  ] as const

  return (
    <div className="space-y-8 container py-6 mx-auto max-w-5xl animate-fade-in">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Admin · Analytics</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">Lab activity, utilisation, consumables, and tool accountability.</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 flex-wrap border-b border-border pb-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Top stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Bookings"
              value={bookingsByStatus.reduce((s, e) => s + e.value, 0)}
              icon={<Calendar size={20} />}
              color="#0A84FF"
            />
            <StatCard
              label="Active Checkouts"
              value={allCheckouts.filter(c => !c.returnedAt).length}
              icon={<Package size={20} />}
              color="#FF9500"
              sub={overdueCheckouts.length > 0 ? `${overdueCheckouts.length} overdue` : 'None overdue'}
            />
            <StatCard
              label="Total Projects"
              value={projectsByStatus.reduce((s, e) => s + e.value, 0)}
              icon={<Layers3 size={20} />}
              color="#30D158"
            />
            <StatCard
              label="Overdue Tools"
              value={overdueCheckouts.length}
              icon={<AlertTriangle size={20} />}
              color={overdueCheckouts.length > 0 ? '#FF453A' : '#30D158'}
              sub={overdueCheckouts.length > 0 ? 'Immediate action required' : 'All tools returned on time'}
            />
          </div>

          {/* Bookings + Projects side by side */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bookings by Status</CardTitle>
                <CardDescription>All-time booking outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsByStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No bookings yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={bookingsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name">
                        {bookingsByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [v, 'bookings']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projects by Status</CardTitle>
                <CardDescription>Registered lab projects</CardDescription>
              </CardHeader>
              <CardContent>
                {projectsByStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No projects yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={projectsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name">
                        {projectsByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [v, 'projects']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Equipment Health */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Status</CardTitle>
              <CardDescription>Current operational status across all equipment</CardDescription>
            </CardHeader>
            <CardContent>
              {equipmentHealth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No equipment data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={equipmentHealth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="value" name="Count" fill={BAR_COLOR} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Machine Utilisation Tab ──────────────────────────────────── */}
      {tab === 'utilisation' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bookings per Machine</CardTitle>
              <CardDescription>Top 10 most booked machines (last 200 bookings)</CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsPerMachine.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No booking data</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={bookingsPerMachine} layout="vertical" margin={{ top: 0, right: 16, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="count" name="Bookings" fill="#0A84FF" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Equipment health table */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Breakdown</CardTitle>
              <CardDescription>Status counts per category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {equipmentHealth.map(e => (
                  <div key={e.name} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-36 capitalize">{e.name}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, (e.value / Math.max(...equipmentHealth.map(x => x.value))) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-foreground w-6 text-right">{e.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tool Checkouts Tab ───────────────────────────────────────── */}
      {tab === 'tools' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Currently Out" value={allCheckouts.filter(c => !c.returnedAt).length} icon={<Package size={18} />} color="#FF9500" />
            <StatCard label="Off-Premises" value={offPremises} icon={<TrendingUp size={18} />} color="#BF5AF2" sub="Taken outside the lab" />
            <StatCard label="Overdue" value={overdueCheckouts.length} icon={<AlertTriangle size={18} />} color="#FF453A" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Checkouts by Category</CardTitle>
              <CardDescription>All active (unreturned) tool checkouts grouped by category</CardDescription>
            </CardHeader>
            <CardContent>
              {checkoutsByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No active checkouts</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={checkoutsByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="value" name="Checkouts" fill="#FF9500" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Overdue list */}
          {overdueCheckouts.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle size={18} /> Overdue Tool List
                </CardTitle>
                <CardDescription>These items are past their expected return date.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueCheckouts.map(c => (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                    <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{c.toolName} — Qty {c.quantity}</p>
                      <p className="text-xs text-muted-foreground">
                        Checked out by: <strong>{c.userName}</strong> ({c.userEmail})
                        · Project: {c.projectTitle || c.projectId}
                        · Due: <span className="text-destructive font-medium">{c.expectedReturnDate}</span>
                        {c.locationOfUse === 'taking_outside' && c.outsideLocation && ` · Off-site: ${c.outsideLocation}`}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Consumables Tab ──────────────────────────────────────────── */}
      {tab === 'consumables' && (
        <div className="space-y-6">
          <Section
            title="3D Printer Filament Usage"
            description={`Aggregated from ${consumableBookings.filter(b => b.consumables?.filamentType).length} bookings. Total: ${(totalFilamentGrams / 1000).toFixed(2)} kg`}
          >
            <Card>
              <CardContent className="pt-5">
                {filamentByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No filament data logged yet. Filament details are captured when users make 3D printer bookings.</p>
                ) : (
                  <div className="space-y-3">
                    {filamentByType.map(f => (
                      <div key={f.name} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground w-20">{f.name}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(f.grams / totalFilamentGrams) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-20 text-right">{(f.grams / 1000).toFixed(2)} kg</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">{Math.round((f.grams / totalFilamentGrams) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Section>

          <Section
            title="Laser Cutter Material Usage"
            description="Material types used in laser cutter sessions"
          >
            <Card>
              <CardContent className="pt-5">
                {materialByType.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No material data logged yet. Material details are captured when users make laser cutter bookings.</p>
                ) : (
                  <div className="space-y-3">
                    {materialByType.map((m, i) => (
                      <div key={m.name} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground w-24">{m.name}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(m.count / materialByType[0].count) * 100}%`,
                              background: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-14 text-right">{m.count} sessions</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Section>

          {/* Export note */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Procurement planning:</strong> Export consumable usage to estimate monthly procurement needs.
                Target: Filament orders when stock &lt; 2 weeks estimated usage.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

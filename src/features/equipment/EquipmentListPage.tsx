import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Grid, List, Wrench, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react'
import type { Equipment, EquipmentCategory } from '@/types'

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  reserved: { label: 'Reserved', color: 'bg-blue-100 text-blue-700', icon: Clock },
  in_use: { label: 'In Use', color: 'bg-orange-100 text-orange-700', icon: Wrench },
  under_maintenance: { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  out_of_service: { label: 'Out of Service', color: 'bg-red-100 text-red-700', icon: XCircle },
  retired: { label: 'Retired', color: 'bg-gray-100 text-gray-500', icon: XCircle },
}

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
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Equipment</p>
          <h1 className="text-2xl font-display font-bold mt-1">Machines & Equipment</h1>
          <p className="text-muted-foreground text-sm">Tier-1 equipment requires a booking. Hand tools go through Tool Checkout.</p>
        </div>
        {isStaff && (
          <Link to="/equipment/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 shrink-0">
            <Plus size={16} /> Add Equipment
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search equipment…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex border rounded-md overflow-hidden">
          <button onClick={() => setViewMode('grid')} className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><Grid size={15} /></button>
          <button onClick={() => setViewMode('list')} className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><List size={15} /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          No equipment found matching your filters.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => {
            const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.available
            const Icon = sc.icon
            return (
              <div key={e.id} className="rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate(`/equipment/${e.id}`)}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-mono text-muted-foreground border px-2 py-0.5 rounded">{e.machineId.toUpperCase()}</span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>
                      <Icon size={10} />{sc.label}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-base group-hover:text-primary transition-colors">{e.name}</h3>
                  <p className="text-xs text-accent font-semibold mt-1">{e.category}</p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{e.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-xs px-2 py-1 rounded font-mono ${e.requiresTraining ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                      {e.requiresTraining ? 'TRAINING REQUIRED' : 'OPEN USE'}
                    </span>
                    <Link to={`/bookings/new?machine=${e.id}`} onClick={e2 => e2.stopPropagation()} className="text-xs text-primary hover:underline font-medium">
                      Book →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Training</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(e => {
                const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.available
                const Icon = sc.icon
                return (
                  <tr key={e.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/equipment/${e.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.machineId}</td>
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.location || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${sc.color}`}>
                        <Icon size={10} />{sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${e.requiresTraining ? 'text-orange-600' : 'text-green-600'}`}>
                        {e.requiresTraining ? 'Required' : 'Open'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/bookings/new?machine=${e.id}`} onClick={e2 => e2.stopPropagation()} className="text-xs text-primary hover:underline">Book</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

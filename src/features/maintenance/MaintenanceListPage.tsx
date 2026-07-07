import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Wrench } from 'lucide-react'
import type { MaintenanceRecord } from '@/types'

const STATUS_COLOR = { scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-orange-100 text-orange-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600' }

export default function MaintenanceListPage() {
  const { isStaff } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.MAINTENANCE)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as MaintenanceRecord)
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = records.filter(r => {
    const matchSearch = !search || r.machineName.toLowerCase().includes(search.toLowerCase()) || r.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Maintenance</p>
          <h1 className="text-2xl font-display font-bold mt-1">Maintenance Records</h1>
        </div>
        {isStaff && <Link to="/maintenance/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 shrink-0"><Plus size={16} /> Schedule Maintenance</Link>}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search maintenance…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          {['scheduled','in_progress','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> :
        filtered.length === 0 ? <div className="py-16 text-center text-muted-foreground">No records found.</div> : (
          <table className="w-full text-sm">
            <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Machine</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Scheduled</th>
                <th className="px-4 py-3 text-left">Technician</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/maintenance/${r.id}`)}>
                  <td className="px-4 py-3 font-medium">{r.machineName}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-48 truncate">{r.title}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.scheduledDate}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.technician}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>{r.status.replace('_',' ')}</span></td>
                  <td className="px-4 py-3"><Link to={`/maintenance/${r.id}`} onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

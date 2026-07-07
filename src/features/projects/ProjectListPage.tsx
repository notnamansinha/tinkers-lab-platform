import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus } from 'lucide-react'
import type { Project } from '@/types'

const STATUS_COLOR = { pending: 'bg-orange-100 text-orange-700', active: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700', on_hold: 'bg-yellow-100 text-yellow-700', rejected: 'bg-red-100 text-red-700' }

export default function ProjectListPage() {
  const { user, isStaff } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.PROJECTS)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Project)
    },
    staleTime: 10 * 60 * 1000,
  })

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.userName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Projects</p>
          <h1 className="text-2xl font-display font-bold mt-1">Projects</h1>
          <p className="text-muted-foreground text-sm">Register and track lab projects from ideation to completion.</p>
        </div>
        <Link to="/projects/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 shrink-0"><Plus size={16} /> Register Project</Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses</option>
          {['pending','active','completed','on_hold','rejected'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i) => <div key={i} className="h-20 rounded-lg border bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">No projects found.</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">By</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Start</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.id}</td>
                  <td className="px-4 py-3 font-medium max-w-48 truncate">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.userName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.department}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.userType}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.startDate}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status}</span></td>
                  <td className="px-4 py-3"><Link to={`/projects/${p.id}`} onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

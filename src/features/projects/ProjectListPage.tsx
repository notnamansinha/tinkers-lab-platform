import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, FolderGit2 } from 'lucide-react'
import type { Project } from '@/types'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { EntityCard } from '@/components/common/EntityCard'

export default function ProjectListPage() {
  const navigate = useNavigate()
  const { user, isStaff } = useAuth()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', isStaff ? 'all' : user?.uid],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.PROJECTS)
      // Non-staff only see their own projects (matches the Firestore read rule).
      // No server orderBy on the user query to avoid requiring a composite index;
      // results are sorted client-side below.
      const q = isStaff
        ? query(ref, orderBy('createdAt', 'desc'))
        : query(ref, where('userId', '==', user!.uid))
      const snap = await getDocs(q)
      return snap.docs
        .map(d => ({ ...d.data(), _firestoreId: d.id }) as Project & { _firestoreId: string })
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    },
    enabled: isStaff || !!user,
    staleTime: 10 * 60 * 1000,
  })

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.userName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-lime text-black font-bold'
      case 'completed': return 'bg-indigo text-white font-bold'
      case 'rejected': return 'bg-pink text-black font-bold'
      case 'pending': return 'bg-orange text-black font-bold'
      default: return 'bg-white/10 text-white/60 border border-hairline'
    }
  }

  return (
    <div className="mx-auto mt-2 w-full max-w-[1440px] min-w-0 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Projects & Work"
        description="Register and track lab projects from ideation to prototype completion."
        action={
          <button
            onClick={() => navigate('/projects/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lime text-black font-bold text-xs hover:bg-lime/90 transition-all shadow-sm"
          >
            <Plus size={16} /> Register Project
          </button>
        }
        filters={
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative w-full lg:w-80 shrink-0">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search by title or member..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-near-black border border-hairline text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'active', 'completed', 'on_hold', 'rejected'].map(s => (
                <FilterChip
                  key={s}
                  label={s === 'all' ? 'All Statuses' : s.replace('_', ' ')}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(s)}
                />
              ))}
            </div>
          </div>
        }
      />

      {isLoading ? (
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
             <div key={i} className="min-h-40 rounded-card bg-near-black border border-hairline animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
         <div className="py-10 text-center text-xs text-white/40">
          <FolderGit2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No projects found matching your search criteria.
        </div>
      ) : (
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map(p => (
             <EntityCard key={p._firestoreId} as="button" onClick={() => navigate(`/projects/${p._firestoreId}`)} className="flex min-h-40 cursor-pointer flex-col justify-between p-5">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">ID: {p.projectCode || p._firestoreId?.slice(0, 6)}</span>
                  <span className={cn('px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider', getStatusBadge(p.status))}>
                    {p.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1 group-hover:text-lime transition-colors line-clamp-2 leading-snug">
                  {p.title}
                </h3>

                <p className="text-xs text-white/50 font-medium">{p.userName}</p>
              </div>

              <div className="pt-3 border-t border-hairline flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                <span>{p.department || 'Lab Member'}</span>
                <span>{p.startDate}</span>
              </div>
            </EntityCard>
          ))}
        </div>
      )}
    </div>
  )
}

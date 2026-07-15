import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus } from 'lucide-react'
import type { Project } from '@/types'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { EntityCard } from '@/components/common/EntityCard'

export default function ProjectListPage() {
  const { isStaff } = useAuth()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[#DDF237] text-[#56779D] shadow-[0_0_12px_rgba(221,242,55,0.4)]'
      case 'completed': return 'bg-[#514AF1] text-white'
      case 'rejected': return 'bg-[#EC68D8] text-white'
      case 'pending': return 'bg-[#FFB13F] text-white'
      default: return 'bg-white/10 text-white/70'
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in mt-4">
      <PageHeader
        variant="dark"
        title="Projects"
        description="Register and track lab projects from ideation to completion."
        action={
          <button onClick={() => navigate('/projects/new')} className="tl-pill-button-secondary flex items-center gap-2 px-6">
            <Plus size={18} /> Register Project
          </button>
        }
        filters={
          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
            <div className="relative w-full lg:w-96 flex-shrink-0">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#7D9FC2]" />
              <input
                type="text"
                placeholder="Search by title or member..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="tl-input pl-12 w-full h-[44px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'active', 'completed', 'on_hold', 'rejected'].map(s => (
                <FilterChip
                  key={s}
                  label={s === 'all' ? 'All Statuses' : s.replace('_', ' ')}
                  active={filterStatus === s}
                  onClick={() => setFilterStatus(s)}
                  tone="dark"
                />
              ))}
            </div>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[220px] rounded-[24px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-[14px] text-white/30">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <EntityCard key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer p-6 flex flex-col h-[220px]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">ID: {p.id.slice(0, 6)}</span>
                <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest', getStatusColor(p.status))}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-[20px] font-semibold text-[#56779D] mb-2 group-hover:text-[#DDF237] transition-colors line-clamp-2 leading-tight">
                {p.title}
              </h3>

              <p className="text-[#7D9FC2] font-medium text-[13px] mb-4">{p.userName}</p>

              <div className="mt-auto pt-4 border-t border-white/20 flex justify-between items-center text-[10px] font-semibold uppercase tracking-widest text-[#7D9FC2]">
                <span>{p.department}</span>
                <span>{p.startDate}</span>
              </div>
            </EntityCard>
          ))}
        </div>
      )}
    </div>
  )
}

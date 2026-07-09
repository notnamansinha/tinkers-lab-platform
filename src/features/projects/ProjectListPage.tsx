import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus } from 'lucide-react'
import type { Project } from '@/types'
import { cn } from '@/lib/utils'

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
      case 'active': return 'bg-lime text-black border-black'
      case 'completed': return 'bg-blue text-black border-black'
      case 'rejected': return 'bg-pink text-black border-black'
      default: return 'bg-white/10 text-white border-white/20'
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-in fade-in duration-300">
      {/* ── Header & Filters ── */}
      <div className="tl-panel-indigo p-6 lg:p-8 rounded-[32px] mb-8">
        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 mb-8 border-b-4 border-black/10 pb-6">
          <div>
            <h1 className="font-['Arial_Black'] uppercase text-4xl lg:text-5xl font-black text-white tracking-tight leading-[0.95] mb-2">
              Projects
            </h1>
            <p className="text-white/80 font-bold max-w-md">
              Register and track lab projects from ideation to completion.
            </p>
          </div>
          <button
            onClick={() => navigate('/projects/new')}
            className="tl-pill-button flex items-center gap-2 px-6 shadow-none border-black hover:border-black"
          >
            <Plus size={18} /> Register Project
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Search */}
          <div className="relative w-full lg:w-96 flex-shrink-0">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search by title or member..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="tl-input pl-11 w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'active', 'completed', 'on_hold', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-4 py-2 rounded-full font-bold uppercase tracking-widest text-xs transition-colors border-2",
                  filterStatus === s ? "bg-pink text-black border-black shadow-[2px_2px_0_0_#000]" : "bg-transparent text-white/50 border-white/20 hover:border-white/50 hover:text-white"
                )}
              >
                {s === 'all' ? 'All Statuses' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Project Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[200px] rounded-[24px] bg-[#101010] border-4 border-[#191919] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-white/40 font-bold uppercase tracking-widest bg-[#101010] rounded-[32px] border-4 border-[#191919]">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="group cursor-pointer bg-[#101010] rounded-[24px] border-4 border-[#191919] hover:border-lime transition-all hover:-translate-y-1 p-6 flex flex-col shadow-[4px_4px_0_0_#000]"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="font-bold text-white/30 uppercase tracking-widest text-xs">
                  ID: {p.id.slice(0, 6)}
                </span>
                <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2", getStatusColor(p.status))}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>
              
              <h3 className="font-['Arial_Black'] text-xl text-white uppercase tracking-tight mb-2 group-hover:text-lime transition-colors line-clamp-2">
                {p.title}
              </h3>
              
              <p className="text-white/60 font-bold text-sm mb-4">
                {p.userName}
              </p>

              <div className="mt-auto pt-4 border-t-2 border-[#191919] flex justify-between items-center text-xs font-bold uppercase tracking-widest text-white/40">
                <span>{p.department}</span>
                <span>{p.startDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

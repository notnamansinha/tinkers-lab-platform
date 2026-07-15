import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveUserCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { getUserProjects } from '@/services/firebase/projects'
import type { Equipment, Booking } from '@/types'
import { todayStr } from '@/lib/utils'
import {
  CalendarDays,
  Wrench,
  AlertTriangle,
  Box,
  MessageSquare
} from 'lucide-react'

function BlobGlassBlock({ title, value, icon: Icon, path }: { title: string, value?: number | string, icon: any, path: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(path)}
      className="premium-gradient-card group relative flex flex-col items-center justify-center gap-4 aspect-square hover:-translate-y-1 transition-transform"
    >
      {/* Background blobs for depth */}
      <div className="blob-base blob-1"></div>
      <div className="blob-base blob-2 group-hover:scale-110 transition-transform duration-700"></div>
      <div className="blob-base blob-3 group-hover:scale-110 transition-transform duration-700 delay-100"></div>
      <div className="blob-base blob-4"></div>

      <div className="w-16 h-16 rounded-full bg-white/20 shadow-inner flex items-center justify-center mb-2 z-10 backdrop-blur-sm border border-white/40">
        <Icon size={32} strokeWidth={1.5} className="text-white drop-shadow-md" />
      </div>
      <div className="text-center flex flex-col gap-1 z-10">
        {value !== undefined && <span className="font-brand font-light text-[#56779D] text-[48px] leading-none drop-shadow-sm">{value}</span>}
        <span className="font-brand font-medium text-[#56779D] text-[16px] tracking-wide drop-shadow-sm">{title}</span>
      </div>
    </button>
  )
}

function DataCard({ title, children, alert = false }: { title: string, children: React.ReactNode, alert?: boolean }) {
  return (
    <div className={`premium-glass-card p-8 md:p-10 flex flex-col gap-6 ${alert ? 'border-red-400/50' : ''}`}>
      <h3 className="text-[#56779D]/70 text-[13px] font-brand font-semibold uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const today = todayStr()

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', 'all-dashboard'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.EQUIPMENT)
      const snap = await getDocs(ref)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Equipment)
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: todayBookings = [] } = useQuery({
    queryKey: ['bookings', 'today', user?.uid],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.BOOKINGS)
      const q = query(ref, where('userId', '==', user!.uid), where('date', '==', today))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Booking)
    },
    enabled: !!user,
  })

  const { data: activeCheckouts = [] } = useQuery({
    queryKey: ['toolCheckouts', 'active', user?.uid],
    queryFn: () => getActiveUserCheckouts(user!.uid),
    enabled: !!user,
  })

  const { data: userProjects = [] } = useQuery({
    queryKey: ['projects', 'user', user?.uid],
    queryFn: () => getUserProjects(user!.uid),
    enabled: !!user,
  })

  const overdueCount = activeCheckouts.filter(isCheckoutOverdue).length
  const availableCount = equipment.filter(e => e.status === 'available').length
  const hasAlerts = overdueCount > 0

  return (
    <div className="w-full flex flex-col gap-8 animate-fade-in pt-8">
      
      {/* Top Main Stat */}
      <div className="flex flex-col items-center justify-center py-6">
        <h2 className="text-[#7D9FC2] text-[14px] font-brand font-medium uppercase tracking-widest mb-3">Lab Capacity</h2>
        <div className="flex items-end gap-2">
          <span className="font-brand text-[#56779D] font-light text-[80px] leading-none tracking-tighter">
            {availableCount}
          </span>
          <span className="text-[#7D9FC2] text-[24px] mb-2 font-brand font-light">/ {Math.max(equipment.length, 1)}</span>
        </div>
      </div>

      {/* The 2x2 Soft Glass Grid */}
      <div className="grid grid-cols-2 gap-6 max-w-[700px] mx-auto w-full px-2">
        <BlobGlassBlock 
          title="Schedule" 
          value={todayBookings.length}
          icon={CalendarDays} 
          path="/bookings" 
        />
        <BlobGlassBlock 
          title="Machines" 
          icon={Wrench} 
          path="/equipment" 
        />
        <BlobGlassBlock 
          title="Inventory" 
          value={activeCheckouts.length}
          icon={Box} 
          path="/inventory" 
        />
        <BlobGlassBlock 
          title="Projects" 
          value={userProjects.length}
          icon={MessageSquare} 
          path="/projects" 
        />
      </div>

      {/* Secondary Data Cards Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[700px] mx-auto w-full mt-6 px-2">
        
        <DataCard title="Attention" alert={hasAlerts}>
          {!hasAlerts ? (
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-full bg-white/40 shadow-sm border border-white flex items-center justify-center text-[#6FA9FF]">
                  <AlertTriangle size={24} strokeWidth={2} />
               </div>
               <div className="flex flex-col">
                 <span className="font-brand text-[20px] text-[#56779D] font-medium">All clear</span>
                 <span className="text-[#7D9FC2] text-[15px]">No pending actions</span>
               </div>
            </div>
          ) : (
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-full bg-red-100/80 shadow-sm border border-red-200 flex items-center justify-center text-red-500">
                  <AlertTriangle size={24} strokeWidth={2.5} />
               </div>
               <div className="flex flex-col">
                 <span className="font-brand text-[20px] text-red-500 font-medium">{overdueCount} overdue</span>
                 <span className="text-red-400/80 text-[15px]">Return immediately</span>
               </div>
            </div>
          )}
        </DataCard>

        <DataCard title="Active Projects">
           {userProjects.length === 0 ? (
             <p className="text-[#7D9FC2] text-[15px] h-14 flex items-center">No active projects.</p>
           ) : (
             <div className="flex flex-col gap-4">
               {userProjects.slice(0, 2).map(p => (
                 <div key={p.id} className="flex justify-between items-center py-1 border-b border-[#7D9FC2]/20 last:border-0">
                   <span className="text-[#56779D] text-[16px] font-medium truncate pr-4">{p.title}</span>
                   <span className="text-[#6FA9FF] font-brand text-[14px] font-medium">{p.status === 'active' ? 'ON' : 'PND'}</span>
                 </div>
               ))}
             </div>
           )}
        </DataCard>

      </div>
    </div>
  )
}

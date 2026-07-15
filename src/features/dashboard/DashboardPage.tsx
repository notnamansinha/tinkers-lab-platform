import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveUserCheckouts, isCheckoutOverdue } from '@/services/firebase/toolCheckouts'
import { getUserProjects } from '@/services/firebase/projects'
import type { Equipment, Booking, Project } from '@/types'
import { todayStr } from '@/lib/utils'
import {
  CalendarDays,
  Wrench,
  AlertTriangle,
  Box,
  MessageSquare
} from 'lucide-react'

function KivoBlock({ title, value, icon: Icon, colorClass, path }: { title: string, value?: number | string, icon: any, colorClass: string, path: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(path)}
      className={`relative flex flex-col items-center justify-center gap-4 aspect-square ${colorClass} hover:-translate-y-1 active:scale-[0.98] transition-transform duration-300 overflow-hidden`}
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-md opacity-0 hover:opacity-100 transition-opacity" />
      <div className="w-16 h-16 rounded-[24px] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg relative z-10">
        <Icon size={32} strokeWidth={2} className="text-white" />
      </div>
      <div className="text-center relative z-10 flex flex-col gap-1">
        <span className="font-semibold text-white/90 tracking-wide text-[14px] uppercase">{title}</span>
        {value !== undefined && <span className="font-data text-white text-[28px] leading-none drop-shadow-md">{value}</span>}
      </div>
    </button>
  )
}

function DataCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="kivo-glass-panel p-6 flex flex-col gap-4">
      <h3 className="text-white/60 text-[13px] font-semibold uppercase tracking-widest">{title}</h3>
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
    <div className="w-full flex flex-col gap-6 animate-fade-in pt-4">
      
      {/* Top Main Stat (Like KIVO's large number) */}
      <div className="flex flex-col items-center justify-center py-6">
        <h2 className="text-white/50 text-[12px] font-semibold uppercase tracking-[0.2em] mb-2">Lab Capacity</h2>
        <div className="flex items-end gap-2">
          <span className="font-data text-white text-[64px] leading-none drop-shadow-xl tracking-tighter">
            {availableCount}
          </span>
          <span className="text-white/40 text-[18px] mb-2 font-medium">/ {Math.max(equipment.length, 1)}</span>
        </div>
      </div>

      {/* The 2x2 Grid matching KIVO */}
      <div className="grid grid-cols-2 gap-4 max-w-[600px] mx-auto w-full">
        <KivoBlock 
          title="Schedule" 
          value={todayBookings.length}
          icon={CalendarDays} 
          colorClass="kivo-block-magenta" 
          path="/bookings" 
        />
        <KivoBlock 
          title="Machines" 
          icon={Wrench} 
          colorClass="kivo-block-lime" 
          path="/equipment" 
        />
        <KivoBlock 
          title="Inventory" 
          value={activeCheckouts.length}
          icon={Box} 
          colorClass="kivo-block-orange" 
          path="/inventory" 
        />
        <KivoBlock 
          title="Projects" 
          value={userProjects.length}
          icon={MessageSquare} 
          colorClass="kivo-block-purple" 
          path="/projects" 
        />
      </div>

      {/* Secondary Data Cards Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[600px] mx-auto w-full mt-4">
        
        <DataCard title="Attention">
          {!hasAlerts ? (
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[#DDF237]">
                  <AlertTriangle size={20} />
               </div>
               <div>
                 <p className="font-semibold text-white/90">All clear</p>
                 <p className="text-white/40 text-sm">No pending actions</p>
               </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-[#FF007A]/20 border border-[#FF007A]/50 flex items-center justify-center text-[#FF007A]">
                  <AlertTriangle size={20} />
               </div>
               <div>
                 <p className="font-semibold text-[#FF007A]">{overdueCount} tools overdue</p>
                 <p className="text-white/60 text-sm">Return them immediately</p>
               </div>
            </div>
          )}
        </DataCard>

        <DataCard title="Active Projects">
           {userProjects.length === 0 ? (
             <p className="text-white/40 text-sm h-12 flex items-center">No active projects</p>
           ) : (
             <div className="flex flex-col gap-2">
               {userProjects.slice(0, 2).map(p => (
                 <div key={p.id} className="flex justify-between items-center py-1">
                   <span className="text-white/90 text-sm truncate pr-4">{p.title}</span>
                   <span className="text-[#A8E063] font-data text-xs">{p.status === 'active' ? 'ON' : 'PND'}</span>
                 </div>
               ))}
             </div>
           )}
        </DataCard>

      </div>
    </div>
  )
}

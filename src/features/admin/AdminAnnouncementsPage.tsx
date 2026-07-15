import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/common/PageHeader'
import { DataPanel } from '@/components/common/DataPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const schema = z.object({
  title: z.string().min(3, 'Title required'),
  body: z.string().min(5, 'Body required'),
  priority: z.enum(['normal', 'high', 'urgent']),
  isActive: z.boolean(),
})
type FormData = z.infer<typeof schema>

const PRIORITY_COLOR: Record<string, string> = {
  normal: 'bg-indigo text-white',
  high: 'bg-orange text-white',
  urgent: 'bg-pink text-white',
}

export default function AdminAnnouncementsPage() {
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.ANNOUNCEMENTS)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Announcement)
    },
    staleTime: 5 * 60 * 1000,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'normal', isActive: true },
  })

  const onSubmit = async (data: FormData) => {
    if (!user || !profile) return
    await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), {
      ...data,
      authorId: user.uid,
      authorName: profile.displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    toast.success('Announcement created')
    qc.invalidateQueries({ queryKey: ['admin', 'announcements'] })
    reset()
    setShowForm(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, id), { isActive: !current, updatedAt: serverTimestamp() })
    toast.success(current ? 'Deactivated' : 'Activated')
    qc.invalidateQueries({ queryKey: ['admin', 'announcements'] })
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Announcements"
        description={`${announcements.filter(a => a.isActive).length} active · ${announcements.length} total`}
        action={
          <button onClick={() => setShowForm(s => !s)} className="tl-pill-button flex items-center gap-2 px-6">
            <Plus size={18} /> New
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="tl-form-panel mb-8 space-y-4">
          <h2 className="tl-page-title text-xl text-white">Create Announcement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="tl-input-label-dark">Title *</label>
              <input className={cn('tl-input w-full', errors.title && 'ring-2 ring-pink')} {...register('title')} />
              {errors.title && <p className="text-xs text-pink mt-1 font-medium">{errors.title.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="tl-input-label-dark">Body *</label>
              <textarea rows={3} className={cn('tl-input w-full resize-none', errors.body && 'ring-2 ring-pink')} {...register('body')} />
              {errors.body && <p className="text-xs text-pink mt-1 font-medium">{errors.body.message}</p>}
            </div>
            <div>
              <label className="tl-input-label-dark">Priority</label>
              <select className="tl-input w-full" {...register('priority')}>
                {['normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 accent-indigo" />
              <label htmlFor="isActive" className="text-sm font-medium text-white/70">Active (visible on dashboard)</label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="tl-pill-button flex items-center gap-2">
              {isSubmitting ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Plus size={15} />}
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="tl-pill-button-outline">Cancel</button>
          </div>
        </form>
      )}

      <DataPanel title="All Announcements">
        {isLoading ? (
          <div className="py-16 text-center text-white/40">Loading…</div>
        ) : announcements.length === 0 ? (
          <div className="py-16 text-center text-white/40 flex flex-col items-center gap-3">
            <Bell size={32} className="opacity-30" />
            No announcements yet.
          </div>
        ) : (
          <Table className="">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead>#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((a, idx) => (
                <TableRow key={a.id} className="border-0">
                  <TableCell className="text-white/40 font-mono text-xs">{announcements.length - idx}</TableCell>
                  <TableCell className="font-semibold text-white">{a.title}</TableCell>
                  <TableCell className="text-white/60 text-sm max-w-[240px] truncate">{a.body}</TableCell>
                  <TableCell><span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', PRIORITY_COLOR[a.priority])}>{a.priority}</span></TableCell>
                  <TableCell className="text-white/60 text-sm">{a.authorName}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(a.id, a.isActive)}
                      className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider cursor-pointer transition-colors', a.isActive ? 'bg-lime text-white hover:brightness-110' : 'bg-[rgba(0,0,0,0.4)] text-white hover:bg-[rgba(0,0,0,0.4)]/80')}
                    >
                      {a.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataPanel>
    </div>
  )
}

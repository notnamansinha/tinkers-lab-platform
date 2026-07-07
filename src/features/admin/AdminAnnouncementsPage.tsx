import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  title: z.string().min(3, 'Title required'),
  body: z.string().min(5, 'Body required'),
  priority: z.enum(['normal', 'high', 'urgent']),
  isActive: z.boolean(),
})
type FormData = z.infer<typeof schema>

const PRIORITY_COLOR = { normal: 'bg-blue-100 text-blue-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' }

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

  const inp = (e: boolean) => cn('w-full px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring', e && 'border-destructive')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Admin · Announcements</p>
          <h1 className="text-2xl font-display font-bold mt-1">Announcements</h1>
          <p className="text-muted-foreground text-sm">{announcements.filter(a=>a.isActive).length} active · {announcements.length} total</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90">
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-display font-semibold">Create Announcement</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-full space-y-1"><label className="text-sm font-medium">Title *</label><input className={inp(!!errors.title)} {...register('title')} />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
            <div className="col-span-full space-y-1"><label className="text-sm font-medium">Body *</label><textarea rows={2} className={cn(inp(!!errors.body),'resize-none')} {...register('body')} />{errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}</div>
            <div className="space-y-1"><label className="text-sm font-medium">Priority</label><select className={inp(false)} {...register('priority')}>{['normal','high','urgent'].map(p=><option key={p}>{p}</option>)}</select></div>
            <div className="flex items-center gap-2 mt-6"><input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 accent-primary" /><label htmlFor="isActive" className="text-sm font-medium">Active (visible on dashboard)</label></div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
              {isSubmitting ? <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" /> : <Plus size={15} />} Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> :
        announcements.length === 0 ? <div className="py-16 text-center text-muted-foreground">No announcements yet.</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((a, idx) => (
                <TableRow>
                  <TableCell>{announcements.length - idx}</TableCell>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{a.body}</TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[a.priority]}`}>{a.priority}</span></TableCell>
                  <TableCell>{a.authorName}</TableCell>
                  <TableCell><button onClick={() => toggleActive(a.id, a.isActive)} className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${a.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{a.isActive ? 'Active' : 'Inactive'}</button></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

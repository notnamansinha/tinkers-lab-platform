import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Search, Shield, UserX, UserCheck } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { UserProfile, UserRole } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const ROLES: UserRole[] = ['super_admin','manager','faculty','lab_assistant','student','guest']
const ROLE_COLOR: Record<UserRole, string> = {
  super_admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  faculty: 'bg-blue-100 text-blue-700',
  lab_assistant: 'bg-teal-100 text-teal-700',
  student: 'bg-green-100 text-green-700',
  guest: 'bg-gray-100 text-gray-600',
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const ref = collection(db, COLLECTIONS.USERS)
      const q = query(ref, orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      return snap.docs.map(d => ({ ...d.data() }) as UserProfile)
    },
    staleTime: 5 * 60 * 1000,
  })

  const filtered = users.filter(u => {
    const matchSearch = !search || u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  const updateRole = async (uid: string, role: UserRole) => {
    if (uid === currentUser?.uid && role !== 'super_admin') {
      toast.error('Cannot downgrade your own admin role')
      return
    }
    await doc(db, COLLECTIONS.USERS, uid)
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), { role, updatedAt: serverTimestamp() })
    toast.success('Role updated')
    qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  }

  const toggleActive = async (uid: string, current: boolean) => {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), { isActive: !current, updatedAt: serverTimestamp() })
    toast.success(current ? 'User deactivated' : 'User activated')
    qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-accent">Admin · Users</p>
        <h1 className="text-2xl font-display font-bold mt-1">User Management</h1>
        <p className="text-muted-foreground text-sm">{users.length} total users · Latest to oldest · Manage roles and access.</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading users…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-tl-ink text-white text-xs font-mono uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((u, idx) => (
                  <tr key={u.uid} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{filtered.length - idx}</td>
                    <td className="px-4 py-2.5 font-medium">{u.displayName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{u.email}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.userType}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.department || '—'}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={u.role}
                        onChange={e => updateRole(u.uid, e.target.value as UserRole)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 outline-none cursor-pointer ${ROLE_COLOR[u.role]}`}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggleActive(u.uid, u.isActive)} className={`text-xs px-2 py-1 rounded border transition-colors ${u.isActive ? 'hover:bg-red-50 hover:border-red-200 hover:text-red-700' : 'hover:bg-green-50 hover:border-green-200 hover:text-green-700'}`}>
                        {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t">
              Showing {filtered.length} of {users.length} users · Ordered latest registered first
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

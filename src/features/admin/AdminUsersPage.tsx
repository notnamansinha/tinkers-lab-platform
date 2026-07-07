import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/services/firebase/firestore'
import { Search, Shield, UserX, UserCheck } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { UserProfile, UserRole } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const ROLES: UserRole[] = ['super_admin','faculty','lab_assistant','student']
const ROLE_COLOR: Record<UserRole, string> = {
  super_admin: 'bg-red-100 text-red-700',
  faculty: 'bg-blue-100 text-blue-700',
  lab_assistant: 'bg-teal-100 text-teal-700',
  student: 'bg-green-100 text-green-700',
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
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" className="pl-9" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 text-sm border rounded-md bg-background outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? <div className="py-16 text-center text-muted-foreground">Loading users…</div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u, idx) => (
                  <TableRow>
                    <TableCell>{filtered.length - idx}</TableCell>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.userType}</TableCell>
                    <TableCell>{u.department || '—'}</TableCell>
                    <TableCell>
                      <select
                        value={u.role}
                        onChange={e => updateRole(u.uid, e.target.value as UserRole)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 outline-none cursor-pointer ${ROLE_COLOR[u.role]}`}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                      </select>
                    </TableCell>
                    <TableCell>{formatDateTime(u.createdAt)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(u.uid, u.isActive)} className={`text-xs px-2 py-1 rounded border transition-colors ${u.isActive ? 'hover:bg-red-50 hover:border-red-200 hover:text-red-700' : 'hover:bg-green-50 hover:border-green-200 hover:text-green-700'}`}>
                        {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-t">
              Showing {filtered.length} of {users.length} users · Ordered latest registered first
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

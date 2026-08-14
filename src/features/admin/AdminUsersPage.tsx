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
import { PageHeader } from '@/components/common/PageHeader'
import { FilterChip } from '@/components/common/FilterChip'
import { DataPanel } from '@/components/common/DataPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const ROLES: UserRole[] = ['super_admin', 'faculty', 'lab_assistant', 'student']
const ROLE_COLOR: Record<UserRole, string> = {
  super_admin: 'bg-pink text-white',
  faculty: 'bg-indigo text-white',
  lab_assistant: 'bg-lime text-white',
  student: 'bg-white/40 border border-white/20 shadow-sm text-white',
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
    <div className="mx-auto w-full max-w-[1440px] min-w-0 animate-fade-in">
      <PageHeader
        variant="dark"
        title="Users"
        description={`${users.length} total users · Manage roles and access.`}
        action={
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <Shield size={22} className="text-lime" />
          </div>
        }
        filters={
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative w-full lg:w-80 flex-shrink-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search users…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="tl-input pl-11 w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All roles" active={filterRole === 'all'} onClick={() => setFilterRole('all')} />
              {ROLES.map(r => (
                <FilterChip
                  key={r}
                  label={r.replace('_', ' ')}
                  active={filterRole === r}
                  onClick={() => setFilterRole(r)}
                />
              ))}
            </div>
          </div>
        }
      />

      <DataPanel title="All Users" description={`Showing ${filtered.length} of ${users.length} · Latest first`}>
        <Table className="">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-0">
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden xl:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden lg:table-cell">Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-white/50">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-white/10 border-t-black/60 rounded-full animate-spin" />
                    Loading users…
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map((u, idx) => (
              <TableRow key={u.uid} className="border-0">
                <TableCell className="font-mono text-xs text-white/50">{filtered.length - idx}</TableCell>
                <TableCell className="font-semibold text-white">{u.displayName}</TableCell>
                 <TableCell className="hidden text-sm text-white/50 lg:table-cell">{u.email}</TableCell>
                 <TableCell className="hidden text-xs uppercase text-white/50 xl:table-cell">{u.userType}</TableCell>
                 <TableCell className="hidden text-sm text-white/50 md:table-cell">{u.department || '—'}</TableCell>
                <TableCell>
                  <select
                    value={u.role}
                    onChange={e => updateRole(u.uid, e.target.value as UserRole)}
                    className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border-0 outline-none cursor-pointer', ROLE_COLOR[u.role])}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </TableCell>
                 <TableCell className="hidden text-sm text-white/50 lg:table-cell">{formatDateTime(u.createdAt)}</TableCell>
                <TableCell>
                  <span className={cn('text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider', u.isActive ? 'bg-lime text-white' : 'bg-pink text-white')}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => toggleActive(u.uid, u.isActive)}
                     className="rounded-full p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={u.isActive ? 'Deactivate user' : 'Activate user'}
                  >
                    {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>
    </div>
  )
}

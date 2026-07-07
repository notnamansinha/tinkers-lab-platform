import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, Search, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { signOut } from '@/services/firebase/auth'
import { cn, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { profile, user } = useAuth()
  const { unreadCount, notifications } = useNotifications()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center gap-2 px-4 shrink-0 z-20 sticky top-0">
      {/* Menu toggle */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} className="text-muted-foreground" />
      </button>

      {/* Search trigger */}
      <button
        onClick={() => navigate('/equipment')}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm text-muted-foreground hover:bg-muted/80 transition-colors flex-1 max-w-64"
        aria-label="Search"
      >
        <Search size={15} />
        <span>Search equipment…</span>
        <kbd className="ml-auto text-xs bg-background px-1.5 py-0.5 rounded border">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-md hover:bg-muted transition-colors"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell size={18} className="text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden animate-slide-in">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <button
                  onClick={() => { navigate('/notifications'); setNotifOpen(false) }}
                  className="text-xs text-primary hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {notifications.slice(0, 5).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'px-4 py-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors',
                        !n.isRead && 'bg-primary/5'
                      )}
                    >
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium max-w-24 truncate">{displayName}</span>
            <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden animate-slide-in">
              <div className="px-4 py-3 border-b">
                <p className="font-medium text-sm truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                {profile?.role && (
                  <span className="inline-block mt-1 text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded capitalize">
                    {profile.role.replace('_', ' ')}
                  </span>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(notifOpen || userMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setNotifOpen(false); setUserMenuOpen(false) }}
        />
      )}
    </header>
  )
}

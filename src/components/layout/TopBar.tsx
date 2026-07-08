import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/services/firebase/auth'
import { toast } from 'sonner'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function TopBar() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'USER'
  const roleName = profile?.role ? profile.role.replace('_', ' ').toUpperCase() : ''

  return (
    <header className="h-16 flex items-center justify-between px-4 sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="hidden md:flex" />
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 px-3 h-9 text-muted-foreground justify-start w-64 bg-background"
          onClick={() => navigate('/equipment')}
        >
          <Search size={14} />
          <span className="text-sm font-normal">Search...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>S
          </kbd>
        </Button>

        <Button variant="ghost" size="icon" className="md:hidden">
          <Search size={18} />
        </Button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || ''} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary uppercase">
                  {displayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                {roleName && (
                  <p className="text-[10px] uppercase font-bold text-primary mt-1">
                    {roleName}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

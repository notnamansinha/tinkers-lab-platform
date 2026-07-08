import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Box,
  Wrench,
  Calendar,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  Users,
  Settings,
  Bell
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'

const MENU_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Equipment', icon: Wrench, path: '/equipment' },
  { name: 'Inventory', icon: Box, path: '/inventory' },
  { name: 'Bookings', icon: Calendar, path: '/bookings' },
  { name: 'Issues', icon: AlertTriangle, path: '/issues' },
  { name: 'Maintenance', icon: ClipboardList, path: '/maintenance' },
  { name: 'Workshops', icon: Users, path: '/workshops' },
  { name: 'Reports', icon: MessageSquare, path: '/reports' },
]

export default function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isStaff } = useAuth()
  const isAdmin = isStaff

  return (
    <Sidebar className="border-r border-hairline bg-graphite text-chalk">
      <SidebarHeader className="h-16 px-6 flex items-center justify-center border-b border-hairline">
        <div className="font-display font-bold text-lg tracking-tight text-chalk">
          TINKERERS LAB
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-mono uppercase text-xs tracking-wider mb-2">Main Menu</SidebarGroupLabel>
          <SidebarMenu>
            {MENU_ITEMS.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    isActive={isActive} 
                    onClick={() => navigate(item.path)}
                    className="font-sans"
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-8">
            <SidebarGroupLabel className="text-muted-foreground font-mono uppercase text-xs tracking-wider mb-2">Admin</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={location.pathname.startsWith('/admin')}
                  onClick={() => navigate('/admin')}
                >
                  <Settings className="mr-3 h-4 w-4" />
                  <span>Admin Panel</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={location.pathname.startsWith('/notifications')}
                  onClick={() => navigate('/notifications')}
                >
                  <Bell className="mr-3 h-4 w-4" />
                  <span>Notifications</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}

import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import AppRoutes from '@/routes'

// QueryClient optimized for free tier: aggressive caching, minimal refetches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes — reduces re-fetches
      gcTime: 30 * 60 * 1000,          // 30 minutes cache
      retry: 1,
      refetchOnWindowFocus: false,      // Don't re-fetch on tab switch
      refetchOnMount: false,            // Use cache if available
    },
    mutations: {
      retry: 0,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <NotificationProvider>
              <AppRoutes />
              <Toaster
                position="bottom-right"
                richColors
                closeButton
                duration={4000}
              />
            </NotificationProvider>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

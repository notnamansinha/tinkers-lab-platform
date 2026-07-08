import React from 'react'
import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#08090B' }}>
      <TopBar />
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 md:px-10 py-8">
        <Outlet />
      </main>
    </div>
  )
}

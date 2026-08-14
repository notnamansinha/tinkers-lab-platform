import React from 'react'
import { cn } from '@/lib/utils'

interface EntityCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  as?: 'div' | 'button'
}

export function EntityCard({ children, className, onClick, as = 'div' }: EntityCardProps) {
  const Comp = as === 'button' ? 'button' : 'div'

  return (
    <Comp
      type={as === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group text-left w-full flex flex-col overflow-hidden transition-all duration-200 rounded-card border border-hairline bg-near-black text-white hover:border-white/25 hover:-translate-y-0.5 shadow-sm',
        className
      )}
    >
      {children}
    </Comp>
  )
}

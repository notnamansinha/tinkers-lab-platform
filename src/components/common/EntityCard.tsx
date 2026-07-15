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
        'group text-left w-full flex flex-col overflow-hidden transition-all duration-300',
        'kivo-glass-panel',
        'hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]',
        className
      )}
    >
      {children}
    </Comp>
  )
}

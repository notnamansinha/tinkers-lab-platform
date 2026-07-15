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
        'premium-glass-card hover:-translate-y-1 hover:border-[#6FA9FF]',
        className
      )}
    >
      {children}
    </Comp>
  )
}

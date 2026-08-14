import React from 'react'
import { cn } from '@/lib/utils'

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-10 rounded-full px-3.5 py-2 text-xs font-bold tracking-wide transition-all duration-150 select-none',
        active
          ? 'bg-lime text-black shadow-sm'
          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-hairline'
      )}
    >
      {label}
    </button>
  )
}

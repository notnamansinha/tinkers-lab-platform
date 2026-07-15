import React from 'react'
import { cn } from '@/lib/utils'

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
  tone?: 'light' | 'dark' // Kept for API compatibility, though OLED is mostly dark
}

export function FilterChip({ label, active, onClick, tone = 'dark' }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full font-medium tracking-wide text-[12px] transition-all duration-300',
        active
          ? 'bg-[#72E8FF] text-[#56779D] shadow-sm'
          : 'bg-white/40 text-[#7D9FC2] hover:text-[#56779D] hover:bg-white/60 border border-white/20'
      )}
    >
      {label}
    </button>
  )
}

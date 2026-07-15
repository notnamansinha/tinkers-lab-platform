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
          ? 'bg-[#FF007A] text-white shadow-[0_0_20px_rgba(255,0,122,0.4)]'
          : 'bg-[rgba(255,255,255,0.05)] text-white/50 hover:text-white/80 hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.05)]'
      )}
    >
      {label}
    </button>
  )
}

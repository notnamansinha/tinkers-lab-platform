import React from 'react'
import { cn } from '@/lib/utils'

interface DataPanelProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  headerAction?: React.ReactNode
}

export function DataPanel({ title, description, children, className, headerAction }: DataPanelProps) {
  return (
    <div className={cn('premium-glass-card p-8 md:p-10 flex flex-col', className)}>
      {(title || description || headerAction) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-white/20">
          <div>
            {title && <h2 className="text-[24px] font-brand font-medium text-[#56779D]">{title}</h2>}
            {description && <p className="text-[#7D9FC2] text-sm mt-1">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  )
}

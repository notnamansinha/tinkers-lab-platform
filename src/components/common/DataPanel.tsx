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
    <div className={cn('flex min-w-0 flex-col rounded-card border border-hairline bg-near-black p-4 text-white shadow-sm sm:p-6', className)}>
      {(title || description || headerAction) && (
        <div className="mb-4 flex min-w-0 flex-col justify-between gap-3 border-b border-hairline pb-3 sm:flex-row sm:items-end">
          <div className="min-w-0">
            {title && <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">{title}</h2>}
            {description && <p className="text-white/60 text-xs sm:text-sm mt-1">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  )
}

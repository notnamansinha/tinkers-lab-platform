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
    <div className={cn('kivo-glass-panel p-6 md:p-8 flex flex-col', className)}>
      {(title || description || headerAction) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-[rgba(255,255,255,0.06)]">
          <div>
            {title && (
              <h2 className="text-white text-[22px] font-semibold tracking-tight leading-none">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-white/40 font-medium text-[13px] mt-2.5">{description}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  )
}

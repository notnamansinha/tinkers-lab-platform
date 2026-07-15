import React from 'react'
import { cn } from '@/lib/utils'

type PanelVariant = 'cream' | 'indigo' | 'pink' | 'dark'

const VARIANT_STYLES: Record<PanelVariant, { panel: string; title: string; desc: string }> = {
  cream: { panel: 'kivo-glass-panel', title: 'text-white', desc: 'text-white/50' },
  indigo: { panel: 'kivo-glass-panel', title: 'text-white', desc: 'text-white/50' },
  pink: { panel: 'kivo-glass-panel', title: 'text-white', desc: 'text-white/50' },
  dark: { panel: 'kivo-glass-panel', title: 'text-white', desc: 'text-white/50' },
}

interface PageHeaderProps {
  title: string
  description?: string
  variant?: PanelVariant
  action?: React.ReactNode
  filters?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  variant = 'dark',
  action,
  filters,
  className,
}: PageHeaderProps) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.dark

  return (
    <div className={cn('rounded-[32px] p-6 lg:p-8 mb-8 relative overflow-hidden', styles.panel, className)}>
      <div className="absolute -top-[50%] -right-[10%] w-[400px] h-[400px] rounded-full bg-[#514AF1] opacity-10 blur-[80px] pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 mb-6 border-b border-[rgba(255,255,255,0.06)] pb-6 relative z-10">
        <div>
          <h1 className={cn('text-[36px] md:text-[44px] font-semibold tracking-tight mb-2 leading-none', styles.title)}>
            {title}
          </h1>
          {description && (
            <p className={cn('font-normal max-w-2xl text-[14px] leading-relaxed', styles.desc)}>{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="relative z-10">
        {filters}
      </div>
    </div>
  )
}

import React from 'react'
import { cn } from '@/lib/utils'

type PanelVariant = 'cream' | 'indigo' | 'pink' | 'dark'

const VARIANT_STYLES: Record<PanelVariant, { panel: string; title: string; desc: string }> = {
  cream: { panel: 'premium-gradient-card', title: 'text-[#56779D]', desc: 'text-white/80' },
  indigo: { panel: 'premium-gradient-card', title: 'text-[#56779D]', desc: 'text-white/80' },
  pink: { panel: 'premium-gradient-card', title: 'text-[#56779D]', desc: 'text-white/80' },
  dark: { panel: 'premium-glass-card', title: 'text-[#56779D]', desc: 'text-[#7D9FC2]' },
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
    <div className={cn('rounded-[34px] p-8 lg:p-10 mb-8 relative overflow-hidden', styles.panel, className)}>
      {variant !== 'dark' && (
        <>
          <div className="blob-base blob-1"></div>
          <div className="blob-base blob-2"></div>
          <div className="blob-base blob-3"></div>
          <div className="blob-base blob-4"></div>
        </>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-4 border-b border-[rgba(255,255,255,0.2)] relative z-10">
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

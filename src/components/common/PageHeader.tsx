import React from 'react'
import { cn } from '@/lib/utils'

type PanelVariant = 'cream' | 'indigo' | 'pink' | 'dark'

const VARIANT_STYLES: Record<PanelVariant, { panel: string; title: string; desc: string }> = {
  cream: { panel: 'bg-cream text-black border border-black/10', title: 'text-black', desc: 'text-black/75' },
  indigo: { panel: 'bg-indigo text-white border border-white/10', title: 'text-white', desc: 'text-white/80' },
  pink: { panel: 'bg-pink text-black border border-black/10', title: 'text-black', desc: 'text-black/75' },
  dark: { panel: 'bg-near-black border border-hairline text-white', title: 'text-white', desc: 'text-white/60' },
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
    <div className={cn('relative mb-5 overflow-hidden rounded-card p-4 shadow-sm sm:p-5 lg:p-6', styles.panel, className)}>
      <div className="relative z-10 mb-4 flex min-w-0 flex-col justify-between gap-4 border-b border-hairline/60 pb-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className={cn('mb-2 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-none tracking-tight', styles.title)}>
            {title}
          </h1>
          {description && (
            <p className={cn('font-normal max-w-2xl text-sm leading-relaxed', styles.desc)}>{description}</p>
          )}
        </div>
        {action && <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{action}</div>}
      </div>
      {filters && <div className="relative z-10">{filters}</div>}
    </div>
  )
}

import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatAccent = 'pink' | 'lime' | 'orange' | 'indigo'

const ACCENT_STYLES: Record<StatAccent, { badge: string; text: string }> = {
  lime: { badge: 'bg-lime text-black', text: 'text-lime' },
  pink: { badge: 'bg-pink text-black', text: 'text-pink' },
  orange: { badge: 'bg-orange text-black', text: 'text-orange-400' },
  indigo: { badge: 'bg-indigo text-white', text: 'text-indigo-400' },
}

export interface StatItem {
  id: string
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  accent: StatAccent
  icon: React.ElementType
  onClick?: () => void
}

interface TabularStatOverviewProps {
  items: StatItem[]
  className?: string
}

export function TabularStatOverview({ items, className }: TabularStatOverviewProps) {
  return (
    <div
      className={cn(
        'w-full rounded-card border border-hairline bg-near-black overflow-hidden shadow-sm',
        className
      )}
    >
      <div className="tl-stat-grid divide-y divide-hairline xl:divide-x xl:divide-y-0">
        {items.map(item => {
          const Icon = item.icon
          const accent = ACCENT_STYLES[item.accent] || ACCENT_STYLES.pink

          const Component = item.onClick ? 'button' : 'div'

          return (
            <Component
              key={item.id}
              type={item.onClick ? 'button' : undefined}
              onClick={item.onClick}
              className="group flex min-w-0 flex-col justify-between p-4 text-left transition-colors duration-150 hover:bg-white/[0.04] focus:bg-white/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-1 ring-offset-near-black xl:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-white/45 transition-colors group-hover:text-white/75 sm:text-[11px]">
                  {item.label}
                </span>
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105',
                    accent.badge
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>

              <div className="mt-3">
                <p className="font-data text-2xl font-extrabold leading-none tracking-tight text-white xl:text-3xl">
                  {item.value}
                </p>
                {item.detail && (
                  <p className="mt-2 text-[11px] sm:text-xs text-white/50 line-clamp-1 group-hover:text-white/75 transition-colors">
                    {item.detail}
                  </p>
                )}
              </div>
            </Component>
          )
        })}
      </div>
    </div>
  )
}

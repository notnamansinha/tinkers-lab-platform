import * as React from 'react'
import { cn } from '@/lib/utils'

type StatAccent = 'pink' | 'lime' | 'orange' | 'indigo'

const ACCENT_STYLES: Record<StatAccent, string> = {
  pink: 'bg-pink text-black',
  lime: 'bg-lime text-black',
  orange: 'bg-orange text-black',
  indigo: 'bg-indigo text-white',
}

interface DarkStatCardProps extends React.HTMLAttributes<HTMLElement> {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  accent?: StatAccent
  icon?: React.ElementType
}

export function DarkStatCard({
  label,
  value,
  detail,
  accent = 'pink',
  icon: Icon,
  className,
  ...props
}: DarkStatCardProps) {
  return (
    <article
      className={cn(
        'flex min-h-40 flex-col justify-between rounded-card border border-hairline bg-near-black p-6 text-white',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', ACCENT_STYLES[accent])}>
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
        )}
      </div>
      <div>
        <p className="font-data text-4xl font-extrabold leading-none tracking-[-0.05em] text-white">{value}</p>
        {detail && <div className="mt-3 text-sm text-white/55">{detail}</div>}
      </div>
    </article>
  )
}

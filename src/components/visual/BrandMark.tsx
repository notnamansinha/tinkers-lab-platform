import * as React from 'react'
import { cn } from '@/lib/utils'

interface FlowerMarkProps extends React.SVGProps<SVGSVGElement> {
  title?: string
}

export function FlowerMark({ className, title, ...props }: FlowerMarkProps) {
  const labelled = Boolean(title)

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('shrink-0', className)}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? title : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      <g fill="var(--color-accent-pink)">
        <ellipse cx="32" cy="14" rx="7" ry="14" />
        <ellipse cx="32" cy="50" rx="7" ry="14" />
        <ellipse cx="14" cy="32" rx="14" ry="7" />
        <ellipse cx="50" cy="32" rx="14" ry="7" />
        <ellipse cx="19" cy="19" rx="6.5" ry="14" transform="rotate(-45 19 19)" />
        <ellipse cx="45" cy="45" rx="6.5" ry="14" transform="rotate(-45 45 45)" />
        <ellipse cx="45" cy="19" rx="14" ry="6.5" transform="rotate(-45 45 19)" />
        <ellipse cx="19" cy="45" rx="14" ry="6.5" transform="rotate(-45 19 45)" />
      </g>
      <circle cx="32" cy="32" r="4.5" fill="var(--color-cream)" />
    </svg>
  )
}

interface BrandLockupProps extends React.HTMLAttributes<HTMLSpanElement> {
  compact?: boolean
}

export function BrandLockup({ className, compact = false, ...props }: BrandLockupProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-3 text-pink', className)}
      aria-label="Tinkerers Lab"
      {...props}
    >
      <FlowerMark className={compact ? 'h-7 w-7' : 'h-9 w-9'} />
      <span className={cn('font-brand lowercase leading-none', compact ? 'text-xl' : 'text-2xl')}>
        tinkerers lab
      </span>
    </span>
  )
}

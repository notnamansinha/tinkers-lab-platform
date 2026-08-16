import * as React from 'react'
import { cn } from '@/lib/utils'
import brandLogo from '@/assets/tinkerer-figjam/tinkerer-lab-board.webp'

export interface BrandMarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  compact?: boolean
}

export function BrandMark({ className, alt = 'TINKERERS LAB', ...props }: BrandMarkProps) {
  return (
    <img
      src={brandLogo}
      alt={alt}
      className={cn('shrink-0 object-contain rounded-md bg-white p-0.5 shadow-sm', className)}
      loading="eager"
      {...props}
    />
  )
}

// Export FlowerMark as an alias so any legacy imports continue to work seamlessly with the official logo
export const FlowerMark = BrandMark

export interface BrandLockupProps extends React.HTMLAttributes<HTMLSpanElement> {
  compact?: boolean
}

export function BrandLockup({ className, compact = false, ...props }: BrandLockupProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-3', className)}
      aria-label="TINKERERS LAB"
      {...props}
    >
      <BrandMark className={compact ? 'h-8 w-8' : 'h-10 w-10'} />
      <span
        className={cn(
          'leading-none tracking-[0.14em] uppercase',
          compact ? 'text-lg' : 'text-xl'
        )}
        style={{
          fontFamily: "'Comic CAT', 'Outfit', sans-serif",
          fontWeight: 900,
          WebkitTextStroke: '0.8px currentColor',
          color: '#FFFFFF',
        }}
      >
        TINKERERS LAB
      </span>
    </span>
  )
}



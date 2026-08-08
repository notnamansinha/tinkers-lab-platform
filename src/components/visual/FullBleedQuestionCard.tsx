import * as React from 'react'
import { cn } from '@/lib/utils'

interface FullBleedQuestionCardProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow?: string
  title: string
  description?: string
  controls?: React.ReactNode
}

export function FullBleedQuestionCard({
  eyebrow,
  title,
  description,
  controls,
  className,
  children,
  ...props
}: FullBleedQuestionCardProps) {
  return (
    <section
      className={cn(
        'flex min-h-[22rem] flex-col rounded-card bg-indigo p-6 text-white md:min-h-[28rem] md:p-8',
        className,
      )}
      {...props}
    >
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl text-[clamp(2.75rem,7vw,5.5rem)] font-extrabold leading-[0.9] tracking-[-0.065em] text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-white/75 md:text-base">
            {description}
          </p>
        )}
      </div>

      {children}

      {controls && (
        <div className="mt-auto grid gap-4 pt-10 sm:grid-cols-2">
          {controls}
        </div>
      )}
    </section>
  )
}

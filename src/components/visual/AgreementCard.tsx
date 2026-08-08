import * as React from 'react'
import { cn } from '@/lib/utils'

interface AgreementCardProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'title'> {
  title: React.ReactNode
  description: React.ReactNode
  inputProps: React.InputHTMLAttributes<HTMLInputElement>
  error?: string
  required?: boolean
  tone?: 'dark' | 'indigo'
}

export function AgreementCard({
  title,
  description,
  inputProps,
  error,
  required = false,
  tone = 'dark',
  className,
  ...props
}: AgreementCardProps) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-start gap-4 rounded-card border p-5 transition-colors',
        tone === 'indigo' ? 'bg-indigo-light text-white' : 'bg-charcoal text-white',
        error ? 'border-pink' : 'border-hairline hover:border-pink/60',
        className,
      )}
      {...props}
    >
      <input
        {...inputProps}
        type="checkbox"
        aria-invalid={Boolean(error)}
        className={cn('peer sr-only', inputProps.className)}
      />
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-black text-sm font-black text-black transition-all peer-checked:border-lime peer-checked:bg-lime peer-focus-visible:ring-2 peer-focus-visible:ring-pink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black"
      >
        <span className="opacity-0 transition-opacity peer-checked:opacity-100 group-has-[:checked]:opacity-100">✓</span>
      </span>
      <span className="min-w-0">
        <span className="block text-base font-extrabold tracking-[-0.02em] text-white">
          {title} {required && <span className="text-pink">*</span>}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-white/60">{description}</span>
        {error && <span className="mt-2 block text-xs font-bold text-pink">{error}</span>}
      </span>
    </label>
  )
}

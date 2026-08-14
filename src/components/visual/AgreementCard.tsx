import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgreementCardProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
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
  className,
  ...props
}: AgreementCardProps) {
  const [localChecked, setLocalChecked] = React.useState(Boolean(inputProps.defaultChecked))
  const isControlled = 'checked' in inputProps
  const isChecked = isControlled ? Boolean(inputProps.checked) : localChecked

  return (
    <label
      className={cn(
        'group flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-200 select-none',
        isChecked
          ? 'border-lime/40 bg-lime/[0.04]'
          : 'bg-black/40 border-hairline hover:border-white/25',
        error && 'border-pink/60 bg-pink/[0.03]',
        className
      )}
      {...props}
    >
      <input
        {...inputProps}
        type="checkbox"
        aria-invalid={Boolean(error)}
        className={cn('peer sr-only', inputProps.className)}
        onChange={(e) => {
          if (!isControlled) setLocalChecked(e.currentTarget.checked)
          inputProps.onChange?.(e)
        }}
      />
      
      {/* Styled Checkbox Box */}
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-black transition-all duration-150',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-lime peer-focus-visible:ring-offset-1 ring-offset-near-black',
          isChecked
            ? 'border-lime bg-lime text-black font-extrabold shadow-sm'
            : 'border-white/30 bg-white/5 hover:border-white/50 text-transparent'
        )}
      >
        <Check className={cn('h-3.5 w-3.5 stroke-[3]', isChecked ? 'opacity-100' : 'opacity-0')} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-xs sm:text-sm font-bold tracking-tight text-white leading-snug">
          {title} {required && <span className="text-pink">*</span>}
        </span>
        {description && (
          <span className="mt-1 block text-xs leading-relaxed text-white/60 font-normal">
            {description}
          </span>
        )}
        {error && <span className="mt-1.5 block text-xs font-bold text-pink">{error}</span>}
      </span>
    </label>
  )
}

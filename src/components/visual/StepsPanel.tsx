import * as React from 'react'
import { cn } from '@/lib/utils'

interface StepItem {
  title: string
  description: string
}

interface StepsPanelProps extends React.HTMLAttributes<HTMLElement> {
  eyebrow?: string
  title: string
  steps: StepItem[]
  action?: React.ReactNode
}

const STEP_STYLES = ['bg-lime', 'bg-orange', 'bg-pink']

export function StepsPanel({ eyebrow, title, steps, action, className, ...props }: StepsPanelProps) {
  return (
    <section className={cn('rounded-card bg-tan p-6 text-black md:p-8', className)} {...props}>
      {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/55">{eyebrow}</p>}
      <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-2xl text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[0.92] tracking-[-0.06em] text-black">
          {title}
        </h2>
        {action}
      </div>
      <ol className="mt-10 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className={cn('rounded-card p-5 text-black', STEP_STYLES[index % STEP_STYLES.length])}>
            <span className="font-data text-xs font-bold uppercase tracking-[0.1em]">0{index + 1}</span>
            <h3 className="mt-6 text-2xl font-extrabold leading-none tracking-[-0.04em] text-black">{step.title}</h3>
            <p className="mt-3 text-sm font-medium leading-relaxed text-black/65">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

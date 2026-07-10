import React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, required, error, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-[0.8rem] text-destructive">{error}</p>}
    </div>
  )
}

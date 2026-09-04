import React, { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  className?: string
}

/**
 * Form field wrapper.
 * WCAG 1.3.1 / 4.1.2: the label is associated with the control via a
 * generated htmlFor/id pair, and errors are announced via role="alert"
 * (+ aria-describedby where the control accepts it).
 * Single-element children that accept an id (Input, Textarea, Select
 * trigger, etc.) are cloned with the generated id; composite children
 * (fragments, multiple nodes) are wrapped as-is.
 */
export function FormField({ label, required, error, children, className }: FormFieldProps) {
  const fieldId = useId()
  const errorId = `${fieldId}-error`

  let labelledChild = children
  if (React.isValidElement<{ id?: string; 'aria-describedby'?: string }>(children)) {
    labelledChild = React.cloneElement(children, {
      id: fieldId,
      ...(error
        ? { 'aria-describedby': error ? `${children.props['aria-describedby'] ?? ''} ${errorId}`.trim() : undefined }
        : {}),
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {labelledChild}
      {error && (
        <p id={errorId} role="alert" className="text-[0.8rem] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
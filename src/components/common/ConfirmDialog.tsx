import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  onConfirm: () => void
  confirmLabel?: string
  variant?: 'destructive' | 'default'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onConfirm,
  confirmLabel = 'Confirm',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-card border border-hairline bg-charcoal p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-white">{title}</Dialog.Title>
            <Dialog.Close className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors">
              <X size={18} />
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description className="mt-2 text-sm text-white/50">{description}</Dialog.Description>
          )}

          {children && <div className="mt-4">{children}</div>}

          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-bold transition-all disabled:opacity-60',
                variant === 'destructive'
                  ? 'bg-pink text-black hover:brightness-110'
                  : 'bg-indigo text-white hover:brightness-110'
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Processing…
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

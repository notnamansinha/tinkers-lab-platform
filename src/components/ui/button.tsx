import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[14px] font-semibold tracking-wide transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#72E8FF]/50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#72E8FF] text-[#56779D] hover:brightness-105 shadow-sm",
        destructive: "bg-red-400 text-[#56779D] hover:brightness-110",
        outline: "border border-[#56779D]/30 bg-white/20 text-[#56779D] hover:bg-white/40",
        secondary: "bg-white/50 text-[#56779D] hover:bg-white/70 border border-white/40 shadow-sm",
        ghost: "hover:bg-white/40 hover:text-[#56779D] text-[#7D9FC2]",
        link: "text-[#6FA9FF] underline-offset-4 hover:underline normal-case tracking-normal font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

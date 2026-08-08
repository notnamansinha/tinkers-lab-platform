import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-charcoal border border-hairline text-white px-4 py-3 h-12 placeholder:text-white/35 focus-visible:border-pink focus-visible:ring-2 focus-visible:ring-pink/20 outline-none transition-all w-full min-w-0 rounded-sm file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }

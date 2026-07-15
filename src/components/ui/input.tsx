import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white px-5 py-3 h-12 placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 outline-none transition-all w-full min-w-0 rounded-[16px] backdrop-blur-md file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }

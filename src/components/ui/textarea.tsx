import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white px-5 py-4 min-h-[100px] placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 outline-none transition-all w-full rounded-[16px] backdrop-blur-md resize-y disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

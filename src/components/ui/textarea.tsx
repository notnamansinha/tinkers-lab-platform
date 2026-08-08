import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "bg-charcoal border border-hairline text-white px-4 py-3 min-h-[100px] placeholder:text-white/35 focus-visible:border-pink focus-visible:ring-2 focus-visible:ring-pink/20 outline-none transition-all w-full rounded-sm resize-y disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

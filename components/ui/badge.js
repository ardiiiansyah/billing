import * as React from "react"
import { cn } from "@/lib/utils"

function Badge({ className, variant = "default", ...props }) {
    const variants = {
        default: "border-transparent bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        success: "border-transparent bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "border-transparent bg-amber-500/10 text-amber-400 border-amber-500/20",
        danger: "border-transparent bg-rose-500/10 text-rose-400 border-rose-500/20",
        outline: "border-slate-700 text-slate-300",
    }

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                variants[variant] || variants.default,
                className
            )}
            {...props}
        />
    )
}

export { Badge }
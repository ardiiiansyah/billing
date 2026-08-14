import * as React from "react"
import { cn } from "@/lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
        default: "bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold shadow-sm",
        outline: "border border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-200",
        ghost: "hover:bg-slate-800 hover:text-slate-100 text-slate-400",
        destructive: "bg-rose-500 text-white hover:bg-rose-600",
    }

    const sizes = {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
    }

    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
                variants[variant] || variants.default,
                sizes[size] || sizes.default,
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button }
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import * as React from "react"

import { cn } from "~lib/utils"

const buttonVariants = cva(
  [
    "inline-flex h-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-all outline-none shrink-0",
    "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:pointer-events-none disabled:!text-[var(--muted-foreground)]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs",
        ghost: "bg-transparent",
        destructive:
          "bg-destructive/10 text-red-600 shadow-sm hover:bg-destructive/20",
        fancy:
          "shiny-cta focus:outline-none text-white rounded-full py-3! px-6! h-12 min-h-12",
        glass:
          "border-gradient-pill text-slate-300 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] [&_svg]:opacity-70 hover:[&_svg]:opacity-100 [&_svg]:transition-all group backdrop-blur-sm"
      },
      size: {
        default: "px-4 py-2",
        sm: "rounded-full p-2 text-xs",
        md: "rounded-lg px-4",
        lg: "rounded-lg px-8",
        landing: "h-12 min-h-12 rounded-full py-3 px-6 text-sm",
        icon: "aspect-square"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

type ButtonVariants = VariantProps<typeof buttonVariants>

export type ButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  keyof ButtonVariants
> &
  ButtonVariants & {
    asChild?: boolean
    disableHoverScale?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const {
      className,
      variant,
      size,
      asChild = false,
      disableHoverScale = false,
      children,
      ...rest
    } = props
    const Comp = asChild ? Slot : "button"
    const isFancy = variant === "fancy"
    const content = (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...rest}>
        {isFancy ? (
          <span className="inline-flex items-center justify-center gap-2">
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    )
    if (disableHoverScale) {
      return content
    }
    return (
      <motion.span
        className="inline-flex"
        initial={false}
        whileHover={{
          scale: 1.05,
          transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
        }}>
        {content}
      </motion.span>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

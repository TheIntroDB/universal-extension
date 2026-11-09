// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 TheIntroDB

import * as React from "react"

import { cn } from "~lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  // eslint-disable-next-line react/prop-types
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-full w-full rounded-full bg-[var(--primary-bg)] px-3 py-3 shadow-xs file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground outline-none ring-[1.5px] ring-white/10 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm placeholder-[var(--muted-foreground)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

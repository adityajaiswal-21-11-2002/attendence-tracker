"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<
  DropdownMenuContextValue | undefined
>(undefined)

interface DropdownMenuProps {
  children: React.ReactNode
}

const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("DropdownMenuTrigger must be used within DropdownMenu")
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    context.setOpen(!context.open)
    props.onClick?.(e)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
      ref,
    })
  }

  return (
    <button
      ref={ref}
      className={cn(className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("DropdownMenuContent must be used within DropdownMenu")
  }

  if (!context.open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute right-0 z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, onClick, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    context?.setOpen(false)
    onClick?.(e)
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}


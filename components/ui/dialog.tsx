"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | undefined>(
  undefined
)

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open: controlledOpen, onOpenChange, children }: DialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, children, onClick, ...props }, ref) => {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("DialogTrigger must be used within Dialog")
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    context.onOpenChange(true)
    onClick?.(e)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, onClick: handleClick, ref })
  }

  return (
    <button ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  )
})
DialogTrigger.displayName = "DialogTrigger"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("DialogContent must be used within Dialog")
  }

  if (!context.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => context.onOpenChange(false)}
      />
      <div
        ref={ref}
        className={cn(
          "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg rounded-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}


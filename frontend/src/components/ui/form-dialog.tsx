"use client"

import * as React from "react"
import { useId } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

export interface FormField {
  id: string
  label: string
  type: "text" | "password" | "email" | "number" | "url" | "select"
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  defaultValue?: string
}

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: FormField[]
  onSubmit: (values: Record<string, string>) => Promise<void>
  submitText?: string
  cancelText?: string
  loading?: boolean
  trigger?: React.ReactNode
  className?: string
  defaultValues?: Record<string, string>
  extraFooter?: React.ReactNode
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  submitText = "保存",
  cancelText = "取消",
  loading = false,
  trigger,
  className,
  defaultValues = {},
  extraFooter,
}: FormDialogProps) {
  const id = useId()
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    fields.forEach((f) => {
      initial[f.id] = defaultValues[f.id] || f.defaultValue || ""
    })
    return initial
  })
  const [error, setError] = React.useState("")

  // Reset form when dialog opens (only depend on open state, not fields array reference)
  React.useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {}
      fields.forEach((f) => {
        initial[f.id] = defaultValues[f.id] || f.defaultValue || ""
      })
      setValues(initial)
      setError("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "操作失败")
    }
  }

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("sm:max-w-md !rounded-xl", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label
                htmlFor={`${field.id}-${id}`}
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-fg-default)" }}
              >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === "select" ? (
                <select
                  id={`${field.id}-${id}`}
                  value={values[field.id]}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  required={field.required}
                  className={cn(
                    "flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors",
                    "bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                  style={{
                    borderColor: "var(--color-border-default)",
                    color: "var(--color-fg-default)",
                  }}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${field.id}-${id}`}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={values[field.id]}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  required={field.required}
                  className={cn(
                    "flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors",
                    "bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                  style={{
                    borderColor: "var(--color-border-default)",
                    color: "var(--color-fg-default)",
                  }}
                />
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <DialogFooter className="flex-col gap-2">
            {extraFooter}
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                {cancelText}
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                style={{ background: "#6C3FF5" }}
              >
                {loading ? "保存中..." : submitText}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Simple version without form fields - just title, description and custom content
interface SimpleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  trigger?: React.ReactNode
  className?: string
}

export function SimpleDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  className,
}: SimpleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("sm:max-w-md !rounded-xl", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

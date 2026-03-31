"use client"

import { Checkbox } from "@ark-ui/react/checkbox"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ArkCheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

export function ArkCheckbox({ checked, onChange, className, disabled }: ArkCheckboxProps) {
  return (
    <Checkbox.Root
      className={cn("flex items-center gap-3 cursor-pointer", className)}
      checked={checked}
      onCheckedChange={(details) => onChange?.(details.checked === true)}
      disabled={disabled}
    >
      <Checkbox.Control
        className={cn(
          "w-5 h-5 border-2 border-[var(--color-border-default)] rounded flex items-center justify-center",
          "data-[state=checked]:bg-[#6C3FF5] data-[state=checked]:border-[#6C3FF5]",
          "data-[state=indeterminate]:bg-[#6C3FF5] data-[state=indeterminate]:border-[#6C3FF5]",
          "data-hover:border-[#6C3FF5] transition-all duration-200",
          "bg-transparent"
        )}
      >
        <Checkbox.Indicator>
          <CheckIcon className="w-3.5 h-3.5 text-white" />
        </Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.HiddenInput />
    </Checkbox.Root>
  )
}

export function ArkCheckboxWithLabel({ checked, onChange, label, className, disabled }: ArkCheckboxProps & { label: string }) {
  return (
    <Checkbox.Root
      className={cn("flex items-center gap-3 cursor-pointer", className)}
      checked={checked}
      onCheckedChange={(details) => onChange?.(details.checked === true)}
      disabled={disabled}
    >
      <Checkbox.Control
        className={cn(
          "w-5 h-5 border-2 border-[var(--color-border-default)] rounded flex items-center justify-center",
          "data-[state=checked]:bg-[#6C3FF5] data-[state=checked]:border-[#6C3FF5]",
          "data-[state=indeterminate]:bg-[#6C3FF5] data-[state=indeterminate]:border-[#6C3FF5]",
          "data-hover:border-[#6C3FF5] transition-all duration-200",
          "bg-transparent"
        )}
      >
        <Checkbox.Indicator>
          <CheckIcon className="w-3.5 h-3.5 text-white" />
        </Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.Label className="text-sm font-medium text-[var(--color-fg-default)] cursor-pointer">
        {label}
      </Checkbox.Label>
      <Checkbox.HiddenInput />
    </Checkbox.Root>
  )
}

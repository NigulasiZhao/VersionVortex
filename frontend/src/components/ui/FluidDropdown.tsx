"use client"

import * as React from "react"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { ChevronDown, Layers, Package } from "lucide-react"

// Utility function for className merging
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

// Custom hook for click outside detection
function useClickAway(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  React.useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)

    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, handler])
}

// Types
interface PackageOption {
  id: string
  label: string
}

interface FluidDropdownProps {
  options: PackageOption[]
  value: string
  onChange: (value: string) => void
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

// Main component
export function FluidDropdown({ options, value, onChange }: FluidDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hoveredOption, setHoveredOption] = React.useState<string | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.id === value) || options[0]

  useClickAway(dropdownRef, () => setIsOpen(false))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="relative"
        ref={dropdownRef}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center justify-between rounded-xl text-sm font-medium transition-all duration-200",
            "border cursor-pointer px-4 py-2 min-w-[140px]",
            "hover:border-[#6C3FF5] hover:text-[#6C3FF5]",
            isOpen && "border-[#6C3FF5] text-[#6C3FF5]",
          )}
          style={{
            background: "var(--color-canvas-subtle)",
            borderColor: "var(--color-border-default)",
            color: "var(--color-fg-default)",
          }}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4" style={{ color: "#6C3FF5" }} />
            {selectedOption.label}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center w-4 h-4 ml-2"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 1, y: 0, height: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                height: "auto",
                transition: {
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1,
                },
              }}
              exit={{
                opacity: 0,
                y: 0,
                height: 0,
                transition: {
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1,
                },
              }}
              className="absolute left-0 top-full mt-2 z-50 min-w-[180px]"
              onKeyDown={handleKeyDown}
            >
              <motion.div
                className="w-full rounded-lg border shadow-lg overflow-hidden"
                initial={{ borderRadius: 8 }}
                animate={{
                  borderRadius: 12,
                  transition: { duration: 0.2 },
                }}
                style={{
                  background: "var(--color-canvas-default)",
                  borderColor: "var(--color-border-default)",
                  transformOrigin: "top",
                }}
              >
                <motion.div
                  className="py-1.5 relative"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div
                    layoutId="hover-highlight"
                    className="absolute inset-x-1 rounded-md"
                    style={{ background: "rgba(108, 63, 245, 0.1)" }}
                    animate={{
                      y: options.findIndex((o) => (hoveredOption || value) === o.id) * 38,
                      height: 36,
                    }}
                    transition={{
                      type: "spring",
                      bounce: 0.15,
                      duration: 0.4,
                    }}
                  />
                  {options.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => {
                        onChange(option.id)
                        setIsOpen(false)
                      }}
                      onHoverStart={() => setHoveredOption(option.id)}
                      onHoverEnd={() => setHoveredOption(null)}
                      className={cn(
                        "relative flex w-full items-center px-4 py-2 text-sm rounded-md",
                        "transition-colors duration-150",
                        "focus:outline-none",
                        value === option.id || hoveredOption === option.id
                          ? "text-[#6C3FF5]"
                          : "text-[var(--color-fg-default)]",
                      )}
                      whileTap={{ scale: 0.98 }}
                      variants={itemVariants}
                    >
                      <Package className="w-4 h-4 mr-2" style={{ color: value === option.id || hoveredOption === option.id ? "#6C3FF5" : "var(--color-fg-muted)" }} />
                      {option.label}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

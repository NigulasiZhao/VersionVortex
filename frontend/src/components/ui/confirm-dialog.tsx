"use client"

import { motion, AnimatePresence } from "framer-motion"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  loading?: boolean
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  loading = false,
  variant = "default",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.6)" }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md border rounded-xl overflow-hidden"
            style={{
              background: "var(--color-canvas-subtle)",
              borderColor: "var(--color-border-default)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--color-border-default)" }}
            >
              <h3
                className="text-base font-semibold"
                style={{ color: "var(--color-fg-default)" }}
              >
                {title}
              </h3>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-fg-muted)" }}
              >
                {description}
              </p>
            </div>
            <div className="px-5 py-4 flex gap-3 justify-end">
              <button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="px-4 py-2 text-sm border rounded-lg transition-all disabled:opacity-50"
                style={{
                  borderColor: "var(--color-border-default)",
                  color: "var(--color-fg-muted)",
                }}
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                style={{
                  background: variant === "destructive" ? "#F85149" : "#6C3FF5",
                  color: "white",
                }}
              >
                {loading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

"use client"

import * as React from "react"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

function useClickAway(ref: React.RefObject<HTMLElement>, handler: () => void) {
  React.useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return
      handler()
    }
    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)
    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, handler])
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (value: DateRange | null) => void;
  className?: string;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"]

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDate(str: string | null): Date | null {
  if (!str) return null
  const [year, month, day] = str.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false
  return a.getTime() === b.getTime()
}

function getMonthDisplay(year: number, month: number): string {
  const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  return `${year}年 ${MONTHS[month]}`
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentDate, setCurrentDate] = React.useState(() => new Date())
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useClickAway(dropdownRef, () => setIsOpen(false))

  const startDate = parseDate(value?.start)
  const endDate = parseDate(value?.end)

  // Get 6 weeks of days centered around current month
  const getCalendarWeeks = (centerDate: Date): Date[][] => {
    const year = centerDate.getFullYear()
    const month = centerDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Start from Monday of the week containing the 1st
    let startDate = new Date(firstDay)
    const dayOfWeek = firstDay.getDay() - 1 // Monday = 0
    if (dayOfWeek < 0) startDate.setDate(startDate.getDate() - 6)
    else startDate.setDate(startDate.getDate() - dayOfWeek)

    const weeks: Date[][] = []
    let current = new Date(startDate)

    for (let w = 0; w < 6; w++) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) {
        week.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      weeks.push(week)
    }

    return weeks
  }

  const weeks = getCalendarWeeks(currentDate)

  // Get the month that needs navigation
  const displayedMonths = React.useMemo(() => {
    const firstWeekFirstDay = weeks[0][0]
    const lastWeekLastDay = weeks[5][6]

    const months: { year: number; month: number; isCurrent: boolean }[] = []
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    // Check first week
    if (firstWeekFirstDay.getMonth() !== currentMonth) {
      months.push({
        year: firstWeekFirstDay.getFullYear(),
        month: firstWeekFirstDay.getMonth(),
        isCurrent: false
      })
    }

    months.push({ year: currentYear, month: currentMonth, isCurrent: true })

    if (lastWeekLastDay.getMonth() !== currentMonth) {
      months.push({
        year: lastWeekLastDay.getFullYear(),
        month: lastWeekLastDay.getMonth(),
        isCurrent: false
      })
    }

    return months
  }, [weeks, currentDate])

  const handleDayClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      onChange({ start: formatDate(date), end: null })
    } else {
      if (date < startDate) {
        onChange({ start: formatDate(date), end: value?.start })
      } else if (isSameDay(date, startDate)) {
        onChange({ start: formatDate(date), end: formatDate(date) })
        setIsOpen(false)
      } else {
        onChange({ start: value?.start, end: formatDate(date) })
        setIsOpen(false)
      }
    }
  }

  const handleDayHover = (date: Date | null) => {
    if (startDate && !endDate) {
      setHoverDate(date)
    }
  }

  const goToPrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() - 1)
      return newDate
    })
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  const isInRange = (date: Date): boolean => {
    if (!startDate) return false
    const end = endDate || hoverDate
    if (!end) return false
    const lo = startDate < end ? startDate : end
    const hi = startDate < end ? end : startDate
    return date > lo && date < hi
  }

  const isRangeStart = (date: Date): boolean => isSameDay(date, startDate)
  const isRangeEnd = (date: Date): boolean => {
    return isSameDay(date, endDate) || (isSameDay(date, hoverDate) && startDate && !endDate)
  }

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth()
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return isSameDay(date, today)
  }

  const displayText = () => {
    if (!value?.start && !value?.end) return "日期筛选"
    if (value.start && value.end) {
      const [y, m, d] = value.start.split("-")
      const [y2, m2, d2] = value.end.split("-")
      return `${parseInt(m)}/${d} - ${parseInt(m2)}/${d2}`
    }
    if (value.start) return `${value.start} 起`
    return `至 ${value.end}`
  }

  const hasValue = value?.start || value?.end

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("relative", className)} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg text-sm font-medium transition-all duration-200",
            "border px-3 py-1.5 min-w-[120px]",
            "hover:border-[#6C3FF5] hover:text-[#6C3FF5]",
            isOpen && "border-[#6C3FF5] text-[#6C3FF5]",
            hasValue && "text-[#6C3FF5]"
          )}
          style={{
            background: "var(--color-canvas-subtle)",
            borderColor: isOpen ? "#6C3FF5" : "var(--color-border-default)",
          }}
        >
          <Calendar className="w-4 h-4" style={{ color: "#6C3FF5" }} />
          <span>{displayText()}</span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="rounded-xl border shadow-xl overflow-hidden"
                style={{
                  background: "var(--color-canvas-default)",
                  borderColor: "var(--color-border-default)",
                  width: "300px",
                }}
              >
                {/* Navigation Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: "var(--color-border-muted)" }}
                >
                  <button
                    onClick={goToPrevMonth}
                    className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
                  >
                    <ChevronLeft className="w-5 h-5" style={{ color: "var(--color-fg-muted)" }} />
                  </button>
                  <span className="font-medium" style={{ color: "var(--color-fg-default)" }}>
                    {getMonthDisplay(currentDate.getFullYear(), currentDate.getMonth())}
                  </span>
                  <button
                    onClick={goToNextMonth}
                    className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
                  >
                    <ChevronRight className="w-5 h-5" style={{ color: "var(--color-fg-muted)" }} />
                  </button>
                </div>

                {/* Weekday Labels */}
                <div
                  className="grid grid-cols-7 px-2 pt-2"
                  style={{ background: "var(--color-canvas-subtle)" }}
                >
                  {WEEKDAYS.map((day, i) => (
                    <div
                      key={day}
                      className="text-center text-xs py-1.5"
                      style={{ color: i === 5 || i === 6 ? "var(--color-fg-muted)" : "var(--color-fg-muted)" }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days - 6 weeks showing continuous dates */}
                <div className="grid grid-cols-7 p-2 gap-0.5">
                  {weeks.flat().map((date, i) => {
                    const inCurrentMonth = isCurrentMonth(date)
                    const inRange = isInRange(date)
                    const isStart = isRangeStart(date)
                    const isEnd = isRangeEnd(date)
                    const today = isToday(date)

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => handleDayClick(date)}
                        onMouseEnter={() => handleDayHover(date)}
                        onMouseLeave={() => handleDayHover(null)}
                        className={cn(
                          "relative z-10 flex items-center justify-center w-9 h-9 mx-auto rounded-lg text-sm transition-all duration-100",
                          !inCurrentMonth && "opacity-30",
                          !isStart && !isEnd && inRange && "rounded-none",
                          isStart && "rounded-r-lg",
                          isEnd && "rounded-l-lg",
                          !isStart && !isEnd && !inRange && "hover:bg-black/5",
                          (isStart || isEnd) && "bg-[#6C3FF5] text-white hover:bg-[#6C3FF5]",
                          !inCurrentMonth && !isStart && !isEnd && "text-[var(--color-fg-muted)]"
                        )}
                        style={{
                          background: !isStart && !isEnd && inRange ? "rgba(108,63,245,0.15)" : undefined,
                          color: !isStart && !isEnd ? (today ? "var(--color-fg-default)" : "var(--color-fg-default)") : undefined,
                        }}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-t"
                  style={{ borderColor: "var(--color-border-muted)" }}
                >
                  <span className="text-xs" style={{ color: "var(--color-fg-muted)" }}>
                    {!startDate ? "选择开始日期" : !endDate ? "选择结束日期" : "已选择"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onChange(null)}
                      className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-black/5"
                      style={{ color: "var(--color-fg-muted)" }}
                    >
                      清空
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-sm text-white transition-colors"
                      style={{ background: "#6C3FF5" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#5a35e0")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#6C3FF5")}
                    >
                      确定
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

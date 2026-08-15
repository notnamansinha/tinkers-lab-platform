import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn, todayStr } from '@/lib/utils'

interface AestheticDatePickerProps {
  value?: string // YYYY-MM-DD
  onChange: (date: string) => void
  minDate?: string
  maxDate?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: boolean
}

export function AestheticDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date...',
  disabled = false,
  className,
  error = false,
}: AestheticDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const selectedDateObj = value ? new Date(value + 'T00:00:00') : null
  const [viewDate, setViewDate] = useState(() => selectedDateObj || new Date())

  useEffect(() => {
    if (value) {
      setViewDate(new Date(value + 'T00:00:00'))
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1))
  }

  const handleSelectDay = (dayNum: number) => {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(dayNum).padStart(2, '0')
    const dateStr = `${year}-${mm}-${dd}`
    onChange(dateStr)
    setIsOpen(false)
  }

  const buildPresetDate = (daysToAdd: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysToAdd)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`
    return { dateStr, dateObj: d }
  }

  const handlePreset = (daysToAdd: number) => {
    const { dateStr, dateObj } = buildPresetDate(daysToAdd)
    if ((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)) return
    onChange(dateStr)
    setViewDate(dateObj)
    setIsOpen(false)
  }

  const isPresetDisabled = (daysToAdd: number) => {
    const { dateStr } = buildPresetDate(daysToAdd)
    return Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate))
  }

  const formattedValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : ''

  return (
    <div className="relative w-full" ref={popoverRef}>
      <div className="flex items-center gap-2">
        {/* Trigger Input Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={cn(
            'flex-1 h-11 px-3.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all duration-150',
            'bg-near-black border-hairline text-white hover:border-white/30 focus:outline-none focus:border-lime shadow-sm',
            error && 'border-pink text-pink',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CalendarIcon className="h-4 w-4 text-lime shrink-0" />
            <span className={cn('truncate font-bold', !formattedValue && 'text-white/40 font-normal')}>
              {formattedValue || placeholder}
            </span>
          </div>
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled}
            className={cn(
               'flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-transparent p-2 text-white/40 transition-colors hover:border-white/20 hover:text-white',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Clear date"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Popover Dark Theme Calendar */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 max-h-[min(28rem,70vh)] w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-card border border-hairline bg-near-black p-4 text-white shadow-2xl animate-fade-in sm:left-auto sm:right-0" role="dialog" aria-label="Date picker">
          {/* Quick Presets */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-hairline pb-3">
            <button
              type="button"
              onClick={() => handlePreset(0)}
              disabled={isPresetDisabled(0)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-white/5 hover:bg-lime hover:text-black transition-all',
                isPresetDisabled(0) && 'opacity-30 cursor-not-allowed hover:bg-white/5 hover:text-white'
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePreset(1)}
              disabled={isPresetDisabled(1)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-white/5 hover:bg-lime hover:text-black transition-all',
                isPresetDisabled(1) && 'opacity-30 cursor-not-allowed hover:bg-white/5 hover:text-white'
              )}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handlePreset(7)}
              disabled={isPresetDisabled(7)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold uppercase rounded-md bg-white/5 hover:bg-lime hover:text-black transition-all',
                isPresetDisabled(7) && 'opacity-30 cursor-not-allowed hover:bg-white/5 hover:text-white'
              )}
            >
              Next Week
            </button>
          </div>

          {/* Month / Year Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-extrabold tracking-tight">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {dayLabels.map((d) => (
              <span key={d} className="text-[10px] font-bold text-white/40 uppercase">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const mm = String(month + 1).padStart(2, '0')
              const dd = String(dayNum).padStart(2, '0')
              const dateStr = `${year}-${mm}-${dd}`

              const isSelected = value === dateStr
              const isToday = todayStr() === dateStr
              const isDisabled = Boolean(
                (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
              )

              return (
                <div
                  key={dayNum}
                  role="gridcell"
                  {...(isSelected ? { 'aria-selected': true } : {})}
                >
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDay(dayNum)}
                    aria-label={`${monthNames[month]} ${dayNum}, ${year}`}
                    {...(isToday ? { 'aria-current': 'date' as const } : {})}
                    className={cn(
                      'h-8 w-8 text-xs font-bold rounded-lg flex items-center justify-center transition-all',
                      isSelected
                        ? 'bg-lime text-black font-extrabold shadow-sm'
                        : isToday
                        ? 'border border-lime/60 text-lime bg-lime/10'
                        : 'hover:bg-white/10 text-white/80',
                      isDisabled && 'opacity-25 cursor-not-allowed hover:bg-transparent'
                    )}
                  >
                    {dayNum}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

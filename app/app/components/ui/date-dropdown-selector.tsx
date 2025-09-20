
'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface DateDropdownSelectorProps {
  selected?: Date | null
  onSelect: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  minYear?: number
  maxYear?: number
}

const MONTHS = [
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
]

export function DateDropdownSelector({
  selected,
  onSelect,
  label,
  placeholder = 'Select date',
  disabled = false,
  className = '',
  minYear = 2020,
  maxYear = new Date().getFullYear()
}: DateDropdownSelectorProps) {
  const [month, setMonth] = useState<string>('')
  const [day, setDay] = useState<string>('')
  const [year, setYear] = useState<string>('')

  // Initialize from selected date
  useEffect(() => {
    if (selected) {
      setMonth(selected.getMonth().toString())
      setDay(selected.getDate().toString())
      setYear(selected.getFullYear().toString())
    } else {
      setMonth('')
      setDay('')
      setYear('')
    }
  }, [selected])

  // Update parent when any part changes
  useEffect(() => {
    if (month !== '' && day !== '' && year !== '') {
      const monthNum = parseInt(month)
      const dayNum = parseInt(day)
      const yearNum = parseInt(year)
      
      // Validate the date
      const newDate = new Date(yearNum, monthNum, dayNum)
      if (
        newDate.getMonth() === monthNum && 
        newDate.getDate() === dayNum && 
        newDate.getFullYear() === yearNum
      ) {
        onSelect(newDate)
      }
    } else if (month === '' && day === '' && year === '') {
      onSelect(undefined)
    }
  }, [month, day, year, onSelect])

  // Get days in selected month/year
  const getDaysInMonth = () => {
    if (month === '' || year === '') return 31
    const monthNum = parseInt(month)
    const yearNum = parseInt(year)
    return new Date(yearNum, monthNum + 1, 0).getDate()
  }

  const daysInMonth = getDaysInMonth()

  // Generate day options
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString()
  }))

  // Generate year options (recent years first)
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
    value: (maxYear - i).toString(),
    label: (maxYear - i).toString()
  }))

  const handleClear = () => {
    setMonth('')
    setDay('')
    setYear('')
    onSelect(undefined)
  }

  const hasValue = month !== '' && day !== '' && year !== ''

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      
      <div className="space-y-3">
        {/* Date Selection Row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Month */}
          <div>
            <Label className="text-xs text-gray-500">Month</Label>
            <Select 
              value={month} 
              onValueChange={setMonth}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day */}
          <div>
            <Label className="text-xs text-gray-500">Day</Label>
            <Select 
              value={day} 
              onValueChange={setDay}
              disabled={disabled || month === ''}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year */}
          <div>
            <Label className="text-xs text-gray-500">Year</Label>
            <Select 
              value={year} 
              onValueChange={setYear}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {yearOptions.map((y) => (
                  <SelectItem key={y.value} value={y.value}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Selection Display & Clear Button */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            {hasValue ? (
              <span>
                Selected: {MONTHS[parseInt(month)]?.label} {day}, {year}
              </span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
          {hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
              disabled={disabled}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

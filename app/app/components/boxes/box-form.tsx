

'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Package, Loader2, Scan, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { ScanItemButton } from '@/components/scanning'
import { Separator } from '@/components/ui/separator'
import { BoxAuditDialog } from './box-audit-dialog'

interface BoxFormProps {
  roomId: string
  onSubmit: (data: BoxFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<BoxFormData> & { boxNumber?: number, roomId?: string }
  isEditMode?: boolean
  onItemsScanned?: (items: any[]) => void
}

interface BoxFormData {
  boxNumber: number
  name: string
  description: string
  size: string
  type: string
  roomId: string
}

export function BoxForm({
  roomId,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  isEditMode = false,
  onItemsScanned
}: BoxFormProps) {
  const [formData, setFormData] = useState<BoxFormData>({
    boxNumber: initialData?.boxNumber || 1,
    name: initialData?.name || '',
    description: initialData?.description || '',
    size: initialData?.size || 'S',
    type: initialData?.type || 'standard',
    roomId: initialData?.roomId || roomId
  })
  
  const [boxNumberInput, setBoxNumberInput] = useState<string>(initialData?.boxNumber?.toString() || '1')
  const [suggestedBoxNumber, setSuggestedBoxNumber] = useState<number>(1)
  const [suggestions, setSuggestions] = useState<number[]>([])
  const [usedNumbers, setUsedNumbers] = useState<number[]>([])
  const [gaps, setGaps] = useState<number[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [boxNumberError, setBoxNumberError] = useState<string>('')
  const [isValidatingBoxNumber, setIsValidatingBoxNumber] = useState(false)
  const [showConflictWizard, setShowConflictWizard] = useState(false)
  const [conflictResolution, setConflictResolution] = useState<{
    conflictNumber: number
    alternatives: number[]
    reason: string
  } | null>(null)
  const [predictiveSuggestions, setPredictiveSuggestions] = useState<number[]>([])
  const [inputMethod, setInputMethod] = useState<'text' | 'wheel' | 'range'>('text')
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isRoomMapExpanded, setIsRoomMapExpanded] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [hapticEnabled, setHapticEnabled] = useState(true)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [rapidAdjustInterval, setRapidAdjustInterval] = useState<NodeJS.Timeout | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [userPreferences, setUserPreferences] = useState<{
    preferredNumbers: number[]
    inputMethod: 'text' | 'wheel' | 'range'
    useVoice: boolean
    useHaptic: boolean
  }>({
    preferredNumbers: [],
    inputMethod: 'text',
    useVoice: true,
    useHaptic: true
  })
  const [usageStats, setUsageStats] = useState<{
    totalSelections: number
    avgSelectionTime: number
    mostUsedNumbers: number[]
    preferredMethod: string
  }>({
    totalSelections: 0,
    avgSelectionTime: 0,
    mostUsedNumbers: [],
    preferredMethod: 'text'
  })
  const [isSmartMode, setIsSmartMode] = useState(true)
  const [showInsights, setShowInsights] = useState(false)
  const [selectionStartTime, setSelectionStartTime] = useState<number | null>(null)
  const [showAuditDialog, setShowAuditDialog] = useState(false)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Room selection state
  const [rooms, setRooms] = useState<any[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)

  // Load rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('/api/rooms')
        if (response.ok) {
          const data = await response.json()
          setRooms(data)
        }
      } catch (error) {
        console.error('Error fetching rooms:', error)
      } finally {
        setIsLoadingRooms(false)
      }
    }

    fetchRooms()
  }, [])

  // Fetch suggested box number on component mount
  useEffect(() => {
    if (!isEditMode && formData.roomId) {
      fetchSuggestedBoxNumber()
    }
  }, [formData.roomId, isEditMode])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
      if (rapidAdjustInterval) {
        clearInterval(rapidAdjustInterval)
      }
    }
  }, [])

  // Enhanced initialization with dark mode, preferences, and smart features
  useEffect(() => {
    // Check for speech recognition support
    const speechSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    setIsVoiceEnabled(speechSupported)

    // Check for haptic feedback support
    const hapticSupported = 'vibrate' in navigator
    setHapticEnabled(hapticSupported)

    // Check for dark mode preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(prefersDark)

    // Load user preferences from localStorage
    if (roomId && typeof window !== 'undefined') {
      const savedPreferences = localStorage.getItem(`garageGrid_boxForm_preferences_${roomId}`)
      if (savedPreferences) {
        try {
          const preferences = JSON.parse(savedPreferences)
          setUserPreferences(preferences)
          setInputMethod(preferences.inputMethod || 'text')
          setHapticEnabled(preferences.useHaptic && hapticSupported)
        } catch (error) {
          console.error('Error loading preferences:', error)
        }
      }
    }

    // Load usage stats
    if (roomId && typeof window !== 'undefined') {
      const savedStats = localStorage.getItem(`garageGrid_boxForm_stats_${roomId}`)
      if (savedStats) {
        try {
          const stats = JSON.parse(savedStats)
          setUsageStats(stats)
        } catch (error) {
          console.error('Error loading stats:', error)
        }
      }
    }

    // Start selection timer for analytics
    setSelectionStartTime(Date.now())

    // Listen for dark mode changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleDarkModeChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    mediaQuery.addListener(handleDarkModeChange)

    return () => mediaQuery.removeListener(handleDarkModeChange)
  }, [roomId])

  // Smart learning system - analyze user patterns
  const analyzeUserPatterns = () => {
    if (usageStats.totalSelections > 5) {
      // Detect preferred input method
      const methodCounts = {
        text: 0,
        wheel: 0,
        voice: 0
      }
      
      // Update most used numbers
      const numberFrequency: { [key: number]: number } = {}
      userPreferences.preferredNumbers.forEach(num => {
        numberFrequency[num] = (numberFrequency[num] || 0) + 1
      })
      
      const mostUsed = Object.entries(numberFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([num]) => parseInt(num))

      setUsageStats(prev => ({
        ...prev,
        mostUsedNumbers: mostUsed
      }))

      // Smart suggestions based on patterns
      if (mostUsed.length > 0) {
        const smartSuggestions = mostUsed.filter(num => !usedNumbers.includes(num))
        if (smartSuggestions.length > 0 && !isEditMode) {
          // Prepend user's preferred numbers to suggestions
          const enhancedSuggestions = [...new Set([...smartSuggestions.slice(0, 2), ...suggestions])]
          setSuggestions(enhancedSuggestions.slice(0, 6))
        }
      }
    }
  }

  // Enhanced pattern analysis
  useEffect(() => {
    if (isSmartMode) {
      analyzeUserPatterns()
    }
  }, [usageStats.totalSelections, suggestions, usedNumbers, isSmartMode, isEditMode])

  // Fetch the next available box number for the room
  const fetchSuggestedBoxNumber = async () => {
    if (!formData.roomId) {
      console.warn('Cannot fetch suggested box number: roomId is missing')
      return
    }
    
    try {
      const response = await fetch(`/api/boxes/suggest-number?roomId=${formData.roomId}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestedBoxNumber(data.suggestedNumber)
        setSuggestions(data.suggestions || [])
        setUsedNumbers(data.usedNumbers || [])
        setGaps(data.gaps || [])
        setAnalytics(data.analytics || null)
        setFormData(prev => ({ ...prev, boxNumber: data.suggestedNumber }))
        setBoxNumberInput(data.suggestedNumber.toString())
      } else {
        console.error('Failed to fetch suggested box number:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching suggested box number:', error)
    }
  }

  // Enhanced validation with conflict resolution
  const validateBoxNumber = async (boxNumber: number) => {
    if (!formData.roomId) {
      console.warn('Cannot validate box number: roomId is missing')
      return false
    }

    if (isEditMode && boxNumber === initialData?.boxNumber && formData.roomId === initialData?.roomId) {
      setBoxNumberError('')
      setShowConflictWizard(false)
      return true
    }

    setIsValidatingBoxNumber(true)
    setBoxNumberError('')
    setShowConflictWizard(false)

    try {
      const response = await fetch(`/api/boxes/validate-number?roomId=${formData.roomId}&boxNumber=${boxNumber}`)
      if (!response.ok) {
        console.error('Box number validation failed:', response.status, response.statusText)
        setBoxNumberError('Unable to validate box number. Please try again.')
        return false
      }
      
      const { isAvailable, suggestion, alternatives, reason } = await response.json()
      
      if (!isAvailable) {
        // Trigger conflict resolution wizard with haptic feedback
        setConflictResolution({
          conflictNumber: boxNumber,
          alternatives: alternatives || [suggestion].filter(Boolean),
          reason: reason || `Box ${boxNumber} is already in use in this room`
        })
        setShowConflictWizard(true)
        setBoxNumberError('')
        triggerHaptic('warning') // Haptic feedback for conflict
        return false
      } else {
        setBoxNumberError('')
        setShowConflictWizard(false)
        triggerHaptic('success') // Haptic feedback for success
        return true
      }
    } catch (error) {
      console.error('Error validating box number:', error)
      setBoxNumberError('Unable to validate box number')
      return false
    } finally {
      setIsValidatingBoxNumber(false)
    }
  }

  // Generate predictive suggestions based on input
  const generatePredictiveSuggestions = (input: string) => {
    if (!input || input.length === 0) {
      setPredictiveSuggestions([])
      return
    }

    const inputNum = parseInt(input)
    const predictive: number[] = []

    // If they typed a single digit, show related numbers
    if (input.length === 1 && !isNaN(inputNum)) {
      // Add 10s, 20s, etc. based on the digit
      for (let i = 1; i <= 5; i++) {
        const candidate = inputNum + (i * 10)
        if (!usedNumbers.includes(candidate) && candidate <= 99) {
          predictive.push(candidate)
        }
      }
    }

    // If they're typing a multi-digit number, show completions
    if (input.length >= 2) {
      const prefix = input.slice(0, -1)
      for (let i = 0; i <= 9; i++) {
        const candidate = parseInt(prefix + i)
        if (!usedNumbers.includes(candidate) && candidate.toString().startsWith(input.slice(0, -1))) {
          predictive.push(candidate)
        }
      }
    }

    // Add nearby available numbers
    if (!isNaN(inputNum)) {
      [-2, -1, 1, 2].forEach(offset => {
        const candidate = inputNum + offset
        if (candidate > 0 && !usedNumbers.includes(candidate) && !predictive.includes(candidate)) {
          predictive.push(candidate)
        }
      })
    }

    setPredictiveSuggestions(predictive.slice(0, 6))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      return
    }

    // Ensure we have a valid box number
    if (!formData.boxNumber || formData.boxNumber < 1) {
      setBoxNumberError('Please enter a valid box number')
      return
    }

    // Validate box number before submitting
    const isBoxNumberValid = await validateBoxNumber(formData.boxNumber)
    if (!isBoxNumberValid) {
      return
    }

    try {
      // Success haptic feedback before submission
      triggerHaptic('success')
      
      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim()
      })
      
      // Additional success feedback after successful submission
      triggerHaptic('success')
    } catch (error) {
      // Error haptic feedback on submission failure
      triggerHaptic('error')
      throw error
    }
  }

  // Save user preferences to localStorage
  const saveUserPreferences = (newPreferences: Partial<typeof userPreferences>) => {
    const updated = { ...userPreferences, ...newPreferences }
    setUserPreferences(updated)
    if (roomId && typeof window !== 'undefined') {
      localStorage.setItem(`garageGrid_boxForm_preferences_${roomId}`, JSON.stringify(updated))
    }
  }

  // Record selection analytics
  const recordSelection = (number: number, method: string) => {
    const selectionTime = selectionStartTime ? Date.now() - selectionStartTime : 0
    
    // Update usage stats
    const newStats = {
      ...usageStats,
      totalSelections: usageStats.totalSelections + 1,
      avgSelectionTime: usageStats.totalSelections > 0 
        ? (usageStats.avgSelectionTime * usageStats.totalSelections + selectionTime) / (usageStats.totalSelections + 1)
        : selectionTime,
      preferredMethod: method
    }
    
    setUsageStats(newStats)
    if (roomId && typeof window !== 'undefined') {
      localStorage.setItem(`garageGrid_boxForm_stats_${roomId}`, JSON.stringify(newStats))
    }
    
    // Update preferred numbers
    const updatedPreferredNumbers = [...userPreferences.preferredNumbers, number]
      .slice(-10) // Keep only last 10 selections
    
    saveUserPreferences({
      preferredNumbers: updatedPreferredNumbers,
      inputMethod: method as any
    })
    
    // Reset timer
    setSelectionStartTime(Date.now())
  }

  // Success celebration animation
  const celebrateSuccess = () => {
    // Create floating success animation
    const celebration = document.createElement('div')
    celebration.innerHTML = '✨ 🎉 ✨'
    celebration.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2rem;
      z-index: 1000;
      pointer-events: none;
      animation: celebrate 0.8s ease-out forwards;
    `
    
    // Add celebration animation CSS if not exists
    if (!document.getElementById('celebrate-styles')) {
      const style = document.createElement('style')
      style.id = 'celebrate-styles'
      style.textContent = `
        @keyframes celebrate {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1) translateY(-20px); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }
    
    document.body.appendChild(celebration)
    setTimeout(() => celebration.remove(), 1000)
  }

  // Enhanced quick-select with analytics and celebration
  const handleQuickSelect = (selectedNumber: number) => {
    setBoxNumberInput(selectedNumber.toString())
    setFormData(prev => ({ ...prev, boxNumber: selectedNumber }))
    
    // Clear previous validation timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }
    
    // Haptic feedback and celebration
    triggerHaptic('light')
    if (isSmartMode) {
      celebrateSuccess()
    }
    
    // Record analytics
    recordSelection(selectedNumber, 'quick-select')
    
    // Immediate validation for quick-select
    validateBoxNumber(selectedNumber)
  }

  // Handle box number change with predictive suggestions
  const handleBoxNumberChange = (value: string) => {
    // Always update the input display value
    setBoxNumberInput(value)
    
    // Clear previous validation timeout and wizard
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }
    setShowConflictWizard(false)
    
    // Generate predictive suggestions immediately
    generatePredictiveSuggestions(value)
    
    // Handle empty input
    if (value.trim() === '') {
      setBoxNumberError('Box number is required')
      setFormData(prev => ({ ...prev, boxNumber: 0 }))
      setPredictiveSuggestions([])
      return
    }

    const boxNumber = parseInt(value)
    
    // Handle invalid input
    if (isNaN(boxNumber) || boxNumber < 1) {
      setBoxNumberError('Box number must be a positive number')
      return
    }
    
    // Clear errors for valid input
    setBoxNumberError('')
    
    // Update form data with valid number
    setFormData(prev => ({ ...prev, boxNumber }))
    
    // Debounced validation for uniqueness
    validationTimeoutRef.current = setTimeout(() => {
      validateBoxNumber(boxNumber)
    }, 300) // Faster response for better UX
  }

  // Handle conflict resolution
  const handleConflictResolution = (resolvedNumber: number) => {
    setBoxNumberInput(resolvedNumber.toString())
    setFormData(prev => ({ ...prev, boxNumber: resolvedNumber }))
    setShowConflictWizard(false)
    setConflictResolution(null)
    
    // Validate the resolved number
    validateBoxNumber(resolvedNumber)
  }

  // Handle room selection change
  const handleRoomChange = (roomId: string) => {
    setFormData(prev => ({ ...prev, roomId }))
    
    // Reset box number suggestions when room changes
    setSuggestions([])
    setUsedNumbers([])
    setGaps([])
    setAnalytics(null)
    
    // If not in edit mode, fetch new suggestions for the room
    if (!isEditMode) {
      // Reset to suggested box number for new room
      setBoxNumberInput('1')
      setFormData(prev => ({ ...prev, boxNumber: 1 }))
      
      // Fetch suggestions after a brief delay to allow state update
      setTimeout(() => {
        fetchSuggestedBoxNumber()
      }, 100)
    }
  }

  // Handle box number selection from audit dialog
  const handleAuditBoxNumberSelect = (selectedNumber: number) => {
    setBoxNumberInput(selectedNumber.toString())
    setFormData(prev => ({ ...prev, boxNumber: selectedNumber }))
    setShowAuditDialog(false)
    
    // Haptic feedback and celebration
    triggerHaptic('light')
    if (isSmartMode) {
      celebrateSuccess()
    }
    
    // Record analytics
    recordSelection(selectedNumber, 'audit-select')
    
    // Validate the selected number
    validateBoxNumber(selectedNumber)
  }

  // Enhanced input method change with preferences and analytics
  const handleInputMethodChange = (method: 'text' | 'wheel' | 'range') => {
    setInputMethod(method)
    
    // Save preference and record usage
    saveUserPreferences({ inputMethod: method })
    recordSelection(parseInt(boxNumberInput) || suggestedBoxNumber, method)
    
    // Haptic feedback for method change
    triggerHaptic('light')
    
    // Show brief success animation
    if (isSmartMode) {
      const methodNames = {
        text: 'Type Mode',
        wheel: 'Wheel Mode', 
        range: 'Range Mode'
      }
      
      // Brief toast-like notification
      const toast = document.createElement('div')
      toast.innerHTML = `📱 ${methodNames[method]} Active`
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.875rem;
        z-index: 1000;
        pointer-events: none;
        animation: slideIn 0.3s ease-out;
      `
      
      // Add slide animation if not exists
      if (!document.getElementById('slide-styles')) {
        const style = document.createElement('style')
        style.id = 'slide-styles'
        style.textContent = `
          @keyframes slideIn {
            0% { transform: translateX(100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }
        `
        document.head.appendChild(style)
      }
      
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 2000)
    }
  }

  // Generate smart insights for users
  const generateInsights = () => {
    const insights = []
    
    if (usageStats.totalSelections > 10) {
      const avgTime = Math.round(usageStats.avgSelectionTime / 1000)
      insights.push(`⚡ Average selection time: ${avgTime}s`)
      
      if (usageStats.mostUsedNumbers.length > 0) {
        insights.push(`🎯 Your favorite numbers: ${usageStats.mostUsedNumbers.slice(0, 3).join(', ')}`)
      }
      
      if (usageStats.preferredMethod) {
        const methodNames = {
          'text': 'typing',
          'wheel': 'wheel controls',
          'quick-select': 'quick select',
          'voice': 'voice commands'
        }
        insights.push(`🎮 You prefer ${methodNames[usageStats.preferredMethod as keyof typeof methodNames] || usageStats.preferredMethod}`)
      }
      
      if (avgTime > 5) {
        insights.push(`💡 Tip: Try voice commands for faster selection`)
      }
      
      if (gaps.length > 0 && usageStats.mostUsedNumbers.some(num => num > 20)) {
        insights.push(`📊 Consider filling gaps: ${gaps.slice(0, 3).join(', ')}`)
      }
    } else {
      insights.push(`🌟 New user! Try different input methods to find your favorite`)
      if (isVoiceEnabled) {
        insights.push(`🎤 Try saying "Box number five" for voice input`)
      }
      insights.push(`🎡 Switch between Type and Wheel modes using the toggle above`)
    }
    
    return insights
  }

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Only handle shortcuts when input is not focused
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return
      
      switch (e.key) {
        case '1':
          e.preventDefault()
          handleInputMethodChange('text')
          break
        case '2':
          e.preventDefault()
          handleInputMethodChange('wheel')
          break
        case 'v':
          if (e.ctrlKey || e.metaKey) return // Let browser handle Ctrl+V
          e.preventDefault()
          if (isVoiceEnabled) startVoiceInput()
          break
        case 'i':
          e.preventDefault()
          setShowInsights(!showInsights)
          break
        case 's':
          e.preventDefault()
          setIsSmartMode(!isSmartMode)
          break
        case 'Escape':
          e.preventDefault()
          setShowInsights(false)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyboardShortcuts)
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [isVoiceEnabled, showInsights, isSmartMode])

  // Haptic feedback helper
  const triggerHaptic = (type: 'success' | 'error' | 'warning' | 'light') => {
    if (!hapticEnabled || typeof navigator.vibrate !== 'function') return
    
    switch (type) {
      case 'success':
        navigator.vibrate(50) // Light success pulse
        break
      case 'error':
        navigator.vibrate([100, 50, 100]) // Double buzz for errors
        break
      case 'warning':
        navigator.vibrate([50, 30, 50]) // Double tap for conflicts
        break
      case 'light':
        navigator.vibrate(25) // Very light tap
        break
    }
  }

  // Voice input handler
  const startVoiceInput = () => {
    if (!isVoiceEnabled || isListening) return

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    setIsListening(true)
    triggerHaptic('light')

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      console.log('Voice input:', transcript)

      // Parse voice commands
      if (transcript.includes('next available')) {
        handleQuickSelect(suggestedBoxNumber)
        triggerHaptic('success')
      } else if (transcript.includes('fill gap') && gaps.length > 0) {
        handleQuickSelect(gaps[0])
        triggerHaptic('success')
      } else {
        // Extract number from transcript
        const numberMatch = transcript.match(/(\d+)/)
        if (numberMatch) {
          const spokenNumber = parseInt(numberMatch[1])
          if (spokenNumber > 0) {
            setBoxNumberInput(spokenNumber.toString())
            setFormData(prev => ({ ...prev, boxNumber: spokenNumber }))
            validateBoxNumber(spokenNumber)
            triggerHaptic('success')
          }
        } else {
          triggerHaptic('error')
        }
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      triggerHaptic('error')
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent, direction?: 'up' | 'down') => {
    if (inputMethod !== 'wheel') return
    
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)

    // Start long press timer for rapid adjustment
    if (direction) {
      const timer = setTimeout(() => {
        startRapidAdjust(direction)
      }, 500) // 500ms for long press
      setLongPressTimer(timer)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (inputMethod !== 'text' || !touchStartY) return
    
    e.preventDefault()
    const touch = e.touches[0]
    const deltaY = touchStartY - touch.clientY
    const threshold = 30

    if (Math.abs(deltaY) > threshold) {
      const direction = deltaY > 0 ? 'up' : 'down'
      adjustNumber(direction)
      setTouchStartY(touch.clientY) // Reset for continuous gesture
    }
  }

  const handleTouchEnd = () => {
    setTouchStartY(null)
    
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    
    // Clear rapid adjust interval
    if (rapidAdjustInterval) {
      clearInterval(rapidAdjustInterval)
      setRapidAdjustInterval(null)
    }
  }

  // Rapid adjustment for long press
  const startRapidAdjust = (direction: 'up' | 'down') => {
    triggerHaptic('light')
    const interval = setInterval(() => {
      adjustNumber(direction)
      triggerHaptic('light')
    }, 150) // Adjust every 150ms during long press
    setRapidAdjustInterval(interval)
  }

  // Enhanced number adjustment with haptic feedback
  const adjustNumber = (direction: 'up' | 'down') => {
    const currentNum = parseInt(boxNumberInput) || suggestedBoxNumber
    const newNum = direction === 'up' ? currentNum + 1 : Math.max(1, currentNum - 1)
    
    // Find next available number in that direction
    let finalNum = newNum
    while (usedNumbers.includes(finalNum) && finalNum < 100) {
      finalNum = direction === 'up' ? finalNum + 1 : Math.max(1, finalNum - 1)
      if (finalNum <= 0) break
    }
    
    if (finalNum > 0 && !usedNumbers.includes(finalNum)) {
      setBoxNumberInput(finalNum.toString())
      setFormData(prev => ({ ...prev, boxNumber: finalNum }))
      validateBoxNumber(finalNum)
      triggerHaptic('light') // Haptic feedback for successful adjustment
    } else {
      triggerHaptic('error') // Error feedback when no adjustment possible
    }
  }

  // Mobile keyboard handling - scroll to show buttons when input is focused
  const scrollToButtons = () => {
    // For mobile devices, ensure the form is scrollable and buttons are visible
    setTimeout(() => {
      const formContainer = document.querySelector('.max-h-\\[60vh\\]')
      const buttonsElement = document.querySelector('[data-mobile-form-buttons]')
      
      if (formContainer && buttonsElement) {
        // Scroll the form container to show the buttons
        buttonsElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        })
      }
    }, 400) // Delay to allow keyboard to appear
  }

  // Early return if roomId is not available
  if (!roomId) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Loading room information...</p>
      </div>
    )
  }

  return (
    <>
      <DialogHeader>
        {/* Enhanced Header with smart features */}
        <div className="flex items-center justify-between mb-2">
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            {isEditMode ? 'Edit Box' : 'Add New Box'}
          </DialogTitle>
          
          <div className="flex items-center gap-2 mr-8">
            {/* Smart Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSmartMode(!isSmartMode)
                saveUserPreferences({ useVoice: !isSmartMode })
                triggerHaptic('light')
              }}
              className={`px-2 py-1 text-xs rounded-full transition-all ${
                isSmartMode 
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isSmartMode ? 'Smart Mode: ON' : 'Smart Mode: OFF'}
            >
              {isSmartMode ? '🧠 Smart' : '⚙️ Basic'}
            </button>

            {/* Insights Toggle */}
            {usageStats.totalSelections > 0 && (
              <button
                type="button"
                onClick={() => setShowInsights(!showInsights)}
                className={`px-2 py-1 text-xs rounded-full transition-all ${
                  showInsights 
                    ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="View Usage Insights"
              >
                📊 Insights
              </button>
            )}
          </div>
        </div>

        <DialogDescription>
          {isEditMode 
            ? 'Update the box details below.'
            : 'Create a new box for organizing items. It will be placed in the staging area until assigned to a rack position.'
          }
          {isSmartMode && (
            <span className="block text-xs text-blue-600 mt-1">
              ✨ Smart mode is analyzing your patterns for better suggestions
            </span>
          )}
        </DialogDescription>

        {/* Smart Insights Panel */}
        {showInsights && (
          <div className="mt-4 p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-600 text-lg">🧠</span>
                <h4 className="font-semibold text-purple-800">Smart Insights</h4>
              </div>
              <button
                onClick={() => setShowInsights(false)}
                className="text-xs px-2 py-1 rounded text-purple-600 hover:text-purple-800 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 text-sm text-purple-700">
              {generateInsights().map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs">•</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="mt-3 pt-3 border-t border-purple-200 text-xs text-purple-600">
              <div className="grid grid-cols-2 gap-2">
                <span><kbd className="px-1 py-0.5 bg-white rounded text-xs">1</kbd> Type mode</span>
                <span><kbd className="px-1 py-0.5 bg-white rounded text-xs">2</kbd> Wheel mode</span>
                <span><kbd className="px-1 py-0.5 bg-white rounded text-xs">V</kbd> Voice input</span>
                <span><kbd className="px-1 py-0.5 bg-white rounded text-xs">I</kbd> Toggle insights</span>
              </div>
            </div>
          </div>
        )}
      </DialogHeader>

      {/* Mobile-optimized form container with proper padding and keyboard-aware height */}
      <div className="max-h-[60vh] sm:max-h-none overflow-y-auto pb-safe">
        <form onSubmit={handleSubmit} className="space-y-4 pb-4">
          {/* Box Number Field */}
          <div>
            <div className="mb-2">
              <Label htmlFor="boxNumber" className="text-sm font-medium text-gray-700 mb-2 block">
                Box Number *
              </Label>
            </div>

            {/* Compact Box Number Input - Mobile Optimized */}
            <div className="flex items-center gap-3">
              <div className="w-20 flex-shrink-0">
                <div className="relative">
                  <Input
                    id="boxNumber"
                    type="number"
                    min="1"
                    value={boxNumberInput}
                    onChange={(e) => handleBoxNumberChange(e.target.value)}
                    placeholder="1"
                    required
                    disabled={isLoading}
                    className={`text-center text-lg font-semibold ${boxNumberError ? 'border-red-500 focus:border-red-500' : ''}`}
                    style={{ fontSize: '16px' }} // Prevent zoom on iOS
                  />
                  {isValidatingBoxNumber && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Audit Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAuditDialog(true)}
                disabled={isLoading}
                className="rounded-full px-3 py-1.5 h-auto text-xs font-medium border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 flex-shrink-0"
                title="Open box number audit to view and select available numbers"
              >
                <Search className="w-3 h-3 mr-1" />
                Audit
              </Button>
              
              {/* Sequential numbering info with lightbulb */}
              {!isEditMode && suggestedBoxNumber && (
                <div className="flex-1 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-blue-600">💡</span>
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">Hint:</span> Box number <span className="font-semibold">{suggestedBoxNumber}</span> is next available number, or edit to label with your own (optional).
                  </div>
                </div>
              )}
            </div>

          {/* Room Selection - Only show in edit mode or when enabled */}
          {(isEditMode || rooms.length > 1) && (
            <div>
              <Label htmlFor="room" className="text-sm font-medium text-gray-700">
                Room * {isEditMode && <span className="text-xs text-orange-600">(Moving box to different room)</span>}
              </Label>
              <Select
                value={formData.roomId || "select-room"}
                onValueChange={handleRoomChange}
                required
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-room" disabled>Select a room</SelectItem>
                  {isLoadingRooms ? (
                    <SelectItem value="loading" disabled>Loading rooms...</SelectItem>
                  ) : rooms.length === 0 ? (
                    <SelectItem value="no-rooms" disabled>No rooms available</SelectItem>
                  ) : (
                    rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {isEditMode && (
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Changing the room will move this box and all its items to the selected room
                </p>
              )}
            </div>
          )}

          {/* Box Name Field - Moved up for better flow */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">Box Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hand Tools, Winter Clothing, Electronics"
              required
              disabled={isLoading}
              onFocus={scrollToButtons}
            />
          </div>

            {/* Enhanced Predictive Suggestions */}
            {predictiveSuggestions.length > 0 && (
              <div className="mt-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="text-blue-500">🧠</span>
                    Smart Predictions
                  </Label>
                  {isSmartMode && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      AI Enhanced
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {predictiveSuggestions.map((num, index) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleQuickSelect(num)}
                      className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 touch-manipulation active:scale-95 ${
                        index === 0
                          ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-200 hover:bg-blue-600'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                      }`}
                      disabled={isLoading}
                      title={index === 0 ? 'Best match' : `Suggestion ${index + 1}`}
                      style={{ minHeight: '40px' }}
                    >
                      {num}
                      {index === 0 && <span className="ml-1 text-xs">⭐</span>}
                    </button>
                  ))}
                </div>
                
                <div className="mt-2 text-xs text-gray-600">
                  💡 These suggestions are based on your typing pattern and available numbers
                </div>
              </div>
            )}

            {/* Conflict Resolution Wizard */}
            {showConflictWizard && conflictResolution && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-orange-600 mt-0.5">🚧</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-800 mb-1">
                      Conflict Detected: Box {conflictResolution.conflictNumber}
                    </h4>
                    <p className="text-sm text-orange-700 mb-3">
                      {conflictResolution.reason}
                    </p>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-orange-800">
                        🎯 Suggested Alternatives:
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {conflictResolution.alternatives.map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleConflictResolution(num)}
                            className="px-4 py-3 bg-white border-2 border-orange-300 text-orange-800 rounded-xl hover:bg-orange-100 transition-all duration-200 text-sm font-semibold touch-manipulation select-none active:scale-95 hover:shadow-md"
                            style={{ minHeight: '48px' }}
                          >
                            Use Box {num}
                            {gaps.includes(num) && <span className="ml-1 text-sm">🔥</span>}
                            {num === suggestedBoxNumber && <span className="ml-1 text-sm">⭐</span>}
                          </button>
                        ))}
                      </div>
                      
                      {/* Additional Context */}
                      <div className="mt-2 pt-2 border-t border-orange-200">
                        <div className="text-xs text-orange-600 space-y-1">
                          {gaps.length > 0 && (
                            <p>🔥 = Fills a gap in your numbering sequence</p>
                          )}
                          <p>⭐ = Primary smart suggestion</p>
                          <p className="font-medium">💡 Tip: Choose a number that maintains your organization system.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Error Display */}
            {boxNumberError && !showConflictWizard && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <span>⚠️</span>
                {boxNumberError}
              </p>
            )}
            




            {/* Collapsible Room Number Map */}
            {!isEditMode && usedNumbers.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setIsRoomMapExpanded(!isRoomMapExpanded)}
                  className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>📊</span>
                    <span>Room Number Map</span>
                  </span>
                  {isRoomMapExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                
                {isRoomMapExpanded && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 mb-3">
                    {Array.from({ length: Math.max(
                      usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0,
                      suggestions.length > 0 ? Math.max(...suggestions) : 0,
                      20
                    ) }, (_, i) => {
                      const num = i + 1
                      const isUsed = usedNumbers.includes(num)
                      const isGap = gaps.includes(num)
                      const isSuggested = suggestions.includes(num)
                      const isSelected = parseInt(boxNumberInput) === num
                      
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => !isUsed ? handleQuickSelect(num) : undefined}
                          disabled={isUsed || isLoading}
                          className={`
                            w-8 h-8 text-xs rounded-lg flex items-center justify-center font-bold
                            transition-all duration-200 border-2 touch-manipulation select-none
                            active:scale-95
                            ${isSelected 
                              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200 shadow-lg' 
                              : isUsed 
                                ? 'bg-red-100 text-red-700 border-red-200 cursor-not-allowed opacity-75' 
                                : isSuggested
                                  ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 cursor-pointer shadow-sm hover:shadow-md'
                                  : isGap
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 cursor-pointer shadow-sm hover:shadow-md'
                                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 cursor-pointer'
                            }
                          `}
                          title={
                            isUsed ? `Box ${num} is already used` 
                            : isSuggested ? `Suggested: Box ${num}` 
                            : isGap ? `Fill gap: Box ${num}`
                            : `Available: Box ${num}`
                          }
                        >
                          {num}
                        </button>
                      )
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                      <span>Used</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                      <span>Suggested</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                      <span>Gap</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                      <span>Available</span>
                    </div>
                  </div>
                  </div>
                )}
              </div>
            )}


          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of the box contents"
              rows={3}
              disabled={isLoading}
              onFocus={scrollToButtons}
            />
          </div>

          <div>
            <Label htmlFor="size">Box Size</Label>
            <Select 
              value={formData.size} 
              onValueChange={(value) => setFormData({ ...formData, size: value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select box size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S">Small (S) - Fits 1 position</SelectItem>
                <SelectItem value="L">Large (L) - Fits 2-3 positions</SelectItem>
                <SelectItem value="XL">Extra Large (XL) - Fits 4+ positions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type">Box Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select box type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Box</SelectItem>
                <SelectItem value="oversized">Oversized Container</SelectItem>
                <SelectItem value="bin">Storage Bin</SelectItem>
                <SelectItem value="drawer">Drawer Unit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add Items with Scanning Option */}
          {!isEditMode && onItemsScanned && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="font-medium mb-2">Add Items to Box</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    After creating the box, you can scan multiple items at once to add them automatically
                  </p>
                  <ScanItemButton
                    onItemsScanned={onItemsScanned}
                    mode="batch"
                    variant="outline"
                    buttonText="Scan Box Contents"
                    className="gap-2"
                  />
                </div>
              </div>
            </>
          )}

          {/* Mobile-optimized button container with proper spacing */}
          <div 
            className="flex justify-end space-x-3 pt-4 border-t pb-2 sm:pb-0 sticky bottom-0 bg-background"
            data-mobile-form-buttons
          >
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="min-w-[100px]"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update Box' : 'Create Box'}
            </Button>
          </div>
        </form>
      </div>

      {/* Box Number Audit Dialog */}
      <BoxAuditDialog
        isOpen={showAuditDialog}
        onClose={() => setShowAuditDialog(false)}
        roomId={roomId}
        onBoxNumberSelect={handleAuditBoxNumberSelect}
      />
    </>
  )
}

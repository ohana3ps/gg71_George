
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  ChefHat, 
  Clock, 
  Users, 
  Sparkles, 
  Heart,
  Filter,
  AlertTriangle,
  ShoppingCart,
  ArrowLeft,
  Utensils,
  Timer,
  Star,
  Settings,
  Edit3,
  AlertCircle,
  Check,
  RotateCcw,
  Printer,
  BookOpen,
  Search,
  Trash2,
  Eye,
  Minus,
  Plus,
  Package,
  Undo2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface FoodItem {
  id: string
  name: string
  category: string | null
  unit: string | null
  quantity: number | null
  expirationDate: string | null
  room: {
    id: string
    name: string
  }
  daysUntilExpiration: number | null
  isExpiring: boolean
}

interface FoodInventory {
  [category: string]: {
    [roomName: string]: FoodItem[]
  }
}

interface RecipePreferences {
  mealType: string
  proteinBase: string
  complexity: string
  timeConstraint: string
  dietaryRestrictions: string[]
  servingSize: number
  useExpiringFirst: boolean
}

const MEAL_TYPES = [
  { value: 'no-preference', label: '🍽️ No Preference', icon: '🍽️' },
  { value: 'breakfast', label: '🌅 Breakfast', icon: '🌅' },
  { value: 'lunch', label: '🌞 Lunch', icon: '🌞' },
  { value: 'dinner', label: '🌙 Dinner', icon: '🌙' },
  { value: 'snack', label: '🥨 Snack', icon: '🥨' },
  { value: 'dessert', label: '🍰 Dessert', icon: '🍰' }
]

const PROTEIN_BASES = [
  { value: 'no-preference', label: '🍽️ No Preference', icon: '🍽️' },
  { value: 'chicken', label: '🐔 Chicken', icon: '🐔' },
  { value: 'beef', label: '🐄 Beef', icon: '🐄' },
  { value: 'fish', label: '🐟 Fish & Seafood', icon: '🐟' },
  { value: 'pork', label: '🐷 Pork', icon: '🐷' },
  { value: 'vegetarian', label: '🌱 Vegetarian', icon: '🌱' },
  { value: 'vegan', label: '🌿 Vegan', icon: '🌿' },
  { value: 'any', label: '🍽️ Any Protein', icon: '🍽️' }
]

const COMPLEXITY_LEVELS = [
  { value: 'no-preference', label: '🍽️ No Preference', description: 'Any difficulty level is fine' },
  { value: 'quick', label: '⚡ Quick & Easy', description: 'Simple recipes with minimal steps' },
  { value: 'moderate', label: '👨‍🍳 Moderate', description: 'Some cooking skills required' },
  { value: 'advanced', label: '👨‍🍳 Advanced', description: 'Complex techniques and ingredients' }
]

const TIME_CONSTRAINTS = [
  { value: 'no-preference', label: '🍽️ No Preference', icon: '🍽️' },
  { value: '15min', label: '⏱️ 15 minutes', icon: '⏱️' },
  { value: '30min', label: '⏰ 30 minutes', icon: '⏰' },
  { value: '1hour', label: '🕐 1 hour', icon: '🕐' },
  { value: '2hours', label: '🕕 2+ hours', icon: '🕕' }
]

const DIETARY_OPTIONS = [
  { id: 'no-preference', label: 'No Preference', icon: '🍽️' },
  { id: 'gluten-free', label: 'Gluten Free', icon: '🌾' },
  { id: 'keto', label: 'Keto', icon: '🥑' },
  { id: 'paleo', label: 'Paleo', icon: '🥩' },
  { id: 'mediterranean', label: 'Mediterranean', icon: '🫒' },
  { id: 'low-carb', label: 'Low Carb', icon: '🥗' },
  { id: 'dairy-free', label: 'Dairy Free', icon: '🥛' }
]

export default function RecipeGeneratorPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [foodInventory, setFoodInventory] = useState<FoodInventory>({})
  const [inventoryStats, setInventoryStats] = useState<any>(null)
  const [preferences, setPreferences] = useState<RecipePreferences>({
    mealType: 'no-preference',
    proteinBase: 'no-preference',
    complexity: 'no-preference',
    timeConstraint: 'no-preference',
    dietaryRestrictions: ['no-preference'], // Default to "No Preference"
    servingSize: 4,
    useExpiringFirst: true
  })
  
  // Stats section collapse state for mobile optimization
  const [statsCollapsed, setStatsCollapsed] = useState(false)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('inventory')
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  
  // My Recipes Tab State
  const [savedRecipes, setSavedRecipes] = useState<any[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [recipesSearchQuery, setRecipesSearchQuery] = useState('')
  const [selectedMealTypeFilter, setSelectedMealTypeFilter] = useState('')
  const [recipeStats, setRecipeStats] = useState<any>(null)
  
  // Direct Quantity Management - Phase 1
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const [recentActions, setRecentActions] = useState<any[]>([])
  const [showUndoToast, setShowUndoToast] = useState(false)
  
  // Pantry Search - New Feature
  const [pantrySearchQuery, setPantrySearchQuery] = useState('')
  
  // Navigation helpers for stats integration
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (session) {
      fetchFoodInventory()
      fetchSavedRecipes()
    }
  }, [session])

  // Also fetch recipes when the My Recipes tab is activated
  useEffect(() => {
    if (session && activeTab === 'recipes') {
      fetchSavedRecipes()
    }
  }, [activeTab, session])

  // Debounced search for recipes
  useEffect(() => {
    if (session && activeTab === 'recipes') {
      const debounceTimer = setTimeout(() => {
        fetchSavedRecipes()
      }, 500)

      return () => clearTimeout(debounceTimer)
    }
  }, [recipesSearchQuery, selectedMealTypeFilter, session, activeTab])

  // Handle URL parameters when returning from Expiration Dashboard
  useEffect(() => {
    const useExpiring = searchParams.get('useExpiring')
    if (useExpiring === 'true') {
      setPreferences(prev => ({ ...prev, useExpiringFirst: true }))
      setActiveTab('generator')
      toast.success('🎯 Recipe Generator will prioritize expiring ingredients!')
      
      // Clean up URL parameter
      router.replace('/recipe-generator', { scroll: false })
    }
  }, [searchParams, router])

  const fetchFoodInventory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/food-inventory')
      if (response.ok) {
        const data = await response.json()
        
        // Transform API response to expected frontend format
        const transformedInventory: FoodInventory = {}
        
        if (data.groupedByCategory) {
          // Convert { category: [items] } to { category: { roomName: [items] } }
          Object.entries(data.groupedByCategory).forEach(([category, items]) => {
            transformedInventory[category] = {}
            
            // Group items in this category by room
            const itemsArray = items as any[]
            itemsArray.forEach(item => {
              const roomName = item.room.name
              if (!transformedInventory[category][roomName]) {
                transformedInventory[category][roomName] = []
              }
              transformedInventory[category][roomName].push(item)
            })
          })
        }
        
        console.log('🍽️ Transformed inventory:', {
          totalCategories: Object.keys(transformedInventory).length,
          categories: Object.keys(transformedInventory),
          apiStats: data.stats,
          sampleStructure: transformedInventory[Object.keys(transformedInventory)[0]]
        })
        
        setFoodInventory(transformedInventory)
        setInventoryStats(data.stats || null)
      } else {
        console.error('Failed to fetch food inventory')
        toast.error('Failed to load food inventory')
      }
    } catch (error) {
      console.error('Error fetching food inventory:', error)
      toast.error('Failed to load food inventory')
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = (key: keyof RecipePreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const toggleDietaryRestriction = (restrictionId: string) => {
    setPreferences(prev => {
      const currentRestrictions = prev.dietaryRestrictions
      
      if (restrictionId === 'no-preference') {
        // If selecting "No Preference", clear all other restrictions
        return {
          ...prev,
          dietaryRestrictions: currentRestrictions.includes('no-preference') ? [] : ['no-preference']
        }
      } else {
        // If selecting any other restriction, remove "No Preference" and toggle the selected restriction
        const withoutNoPreference = currentRestrictions.filter(r => r !== 'no-preference')
        const isCurrentlySelected = withoutNoPreference.includes(restrictionId)
        
        return {
          ...prev,
          dietaryRestrictions: isCurrentlySelected
            ? withoutNoPreference.filter(r => r !== restrictionId)
            : [...withoutNoPreference, restrictionId]
        }
      }
    })
  }

  const handleGenerateRecipe = async () => {
    // Validation is now much more flexible - "no-preference" is a valid selection
    if (!preferences.mealType || !preferences.proteinBase || !preferences.complexity || !preferences.timeConstraint) {
      toast.error('Please select your preferences (or choose "No Preference" for any field)')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGeneratedRecipe(null)
    setActiveTab('generator')
    
    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: preferences
        })
      })

      if (!response.ok) {
        throw new Error(`Recipe generation failed: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let partialRead = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        partialRead += decoder.decode(value, { stream: true })
        let lines = partialRead.split('\n')
        partialRead = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return
            }
            
            try {
              const parsed = JSON.parse(data)
              
              if (parsed.status === 'processing') {
                setGenerationProgress(prev => Math.min(prev + 5, 95))
              } else if (parsed.status === 'completed') {
                setGeneratedRecipe(parsed.recipe)
                setGenerationProgress(100)
                toast.success('🎉 Recipe generated successfully!')
                return
              } else if (parsed.status === 'error') {
                throw new Error(parsed.message || 'Recipe generation failed')
              }
            } catch (e) {
              // Skip invalid JSON chunks
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error generating recipe:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate recipe')
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) {
      toast.error('No recipe to save')
      return
    }

    setIsSavingRecipe(true)
    
    try {
      console.log('🍳 Saving recipe:', generatedRecipe.title)
      
      const recipeData = {
        title: generatedRecipe.title,
        description: generatedRecipe.description,
        prepTime: generatedRecipe.prepTime,
        cookTime: generatedRecipe.cookTime,
        totalTime: generatedRecipe.totalTime,
        servings: generatedRecipe.servings || preferences.servingSize,
        difficulty: generatedRecipe.difficulty,
        ingredients: generatedRecipe.ingredients || [],
        instructions: generatedRecipe.instructions || [],
        nutritionInfo: generatedRecipe.nutritionInfo,
        missingIngredients: generatedRecipe.missingIngredients || [],
        chefTips: generatedRecipe.chefTips || [],
        tags: generatedRecipe.tags || [],
        
        // Include the generation context
        mealType: preferences.mealType,
        proteinBase: preferences.proteinBase,
        complexity: preferences.complexity,
        timeConstraint: preferences.timeConstraint,
        dietaryRestrictions: preferences.dietaryRestrictions,
      }

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save recipe')
      }

      const result = await response.json()
      
      console.log('✅ Recipe saved successfully:', result.recipe.id)
      toast.success(`✨ "${generatedRecipe.title}" saved to your recipe collection!`)
      
      // Refresh recipes list if on My Recipes tab
      if (activeTab === 'recipes') {
        await fetchSavedRecipes()
      }
      
    } catch (error) {
      console.error('❌ Error saving recipe:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save recipe')
    } finally {
      setIsSavingRecipe(false)
    }
  }

  const handlePrintRecipe = (recipe?: any) => {
    const recipeData = recipe || generatedRecipe
    if (!recipeData) {
      toast.error('No recipe to print')
      return
    }

    // Mobile-first approach: Use native browser print without popups
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (isMobile) {
      // Mobile approach: Create temporary print element and use window.print directly
      handleMobilePrint(recipeData)
    } else {
      // Desktop approach: Use popup window
      handleDesktopPrint(recipeData)
    }
  }

  const handleMobilePrint = (recipeData: any) => {
    // Store current page title
    const originalTitle = document.title
    const originalBody = document.body.innerHTML
    
    // Mobile-optimized print content
    const printHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px;">
          <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #1f2937;">${recipeData.title}</h1>
          ${recipeData.description ? `<p style="font-size: 16px; color: #6b7280; margin: 10px 0;">${recipeData.description}</p>` : ''}
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
          ${recipeData.prepTime ? `<div style="text-align: center; padding: 12px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">PREP TIME</div>
            <div style="font-size: 16px; font-weight: bold; color: #1f2937;">${recipeData.prepTime}</div>
          </div>` : ''}
          ${recipeData.cookTime ? `<div style="text-align: center; padding: 12px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">COOK TIME</div>
            <div style="font-size: 16px; font-weight: bold; color: #1f2937;">${recipeData.cookTime}</div>
          </div>` : ''}
        </div>

        <div style="margin: 30px 0;">
          <h2 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 15px;">Ingredients</h2>
          <ul style="padding-left: 20px;">
            ${recipeData.ingredients?.map((ing: any) => 
              `<li style="margin-bottom: 8px; color: #374151;">${ing.amount || ''} ${ing.ingredient || ing.name || ing}</li>`
            ).join('') || ''}
          </ul>
        </div>

        <div style="margin: 30px 0;">
          <h2 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 15px;">Instructions</h2>
          <ol style="padding-left: 20px;">
            ${recipeData.instructions?.map((instruction: any, index: number) => 
              `<li style="margin-bottom: 12px; color: #374151; line-height: 1.6;">${instruction.instruction || instruction}</li>`
            ).join('') || ''}
          </ol>
        </div>
      </div>
    `

    // Temporarily replace page content
    document.title = `${recipeData.title} - Recipe`
    document.body.innerHTML = printHTML

    // Print the page
    window.print()

    // Restore original content
    document.title = originalTitle
    document.body.innerHTML = originalBody
    
    toast.success('🖨️ Recipe sent to printer!')
  }

  const handleDesktopPrint = (recipeData: any) => {
    // Create a new window for printing with styled content
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print recipes')
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${recipeData.title} - Recipe</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; }
            .title { font-size: 32px; font-weight: bold; margin: 0; color: #1f2937; }
            .description { font-size: 16px; color: #6b7280; margin: 10px 0; }
            .recipe-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
            .info-card { text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px; }
            .info-label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 5px; }
            .info-value { font-size: 18px; font-weight: bold; color: #1f2937; }
            .section { margin: 30px 0; }
            .section-title { font-size: 24px; font-weight: bold; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
            .ingredients-list { list-style: none; padding: 0; }
            .ingredient { padding: 10px; margin: 5px 0; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb; }
            .ingredient.available { background: #ecfdf5; border-color: #d1fae5; }
            .ingredient.missing { background: #fef3c7; border-color: #fde68a; }
            .instructions-list { list-style: none; padding: 0; counter-reset: step-counter; }
            .instruction { counter-increment: step-counter; padding: 15px; margin: 10px 0; border: 1px solid #e5e7eb; border-radius: 6px; position: relative; padding-left: 60px; }
            .instruction::before { content: counter(step-counter); position: absolute; left: 15px; top: 15px; width: 30px; height: 30px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
            .tips { background: #eff6ff; padding: 10px; border-radius: 6px; margin-top: 10px; border-left: 4px solid #3b82f6; }
            .tags { margin-top: 20px; }
            .tag { display: inline-block; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; margin: 2px; font-size: 12px; }
            .shopping-list { background: #fffbeb; padding: 15px; border: 1px solid #fde68a; border-radius: 6px; margin: 15px 0; }
            .chef-tips { background: #f0f9ff; padding: 15px; border: 1px solid #bae6fd; border-radius: 6px; margin: 15px 0; }
            .chef-tip { margin: 5px 0; }
            .nutrition { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .nutrition-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; }
            .nutrition-item { text-align: center; }
            .nutrition-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            .nutrition-value { font-size: 18px; font-weight: bold; color: #1f2937; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${recipeData.title}</h1>
            <p class="description">${recipeData.description || ''}</p>
            <div class="tags">
              ${(recipeData.tags || []).map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </div>

          <div class="recipe-info">
            <div class="info-card">
              <div class="info-label">Prep Time</div>
              <div class="info-value">${recipeData.prepTime || 'N/A'}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Cook Time</div>
              <div class="info-value">${recipeData.cookTime || 'N/A'}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Servings</div>
              <div class="info-value">${recipeData.servings || 'N/A'}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Difficulty</div>
              <div class="info-value">${recipeData.difficulty || 'N/A'}</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">🥘 Ingredients</h2>
            <ul class="ingredients-list">
              ${(recipeData.ingredients || []).map((ingredient: any) => `
                <li class="ingredient ${ingredient.available ? 'available' : 'missing'}">
                  <strong>${ingredient.amount || ''} ${ingredient.ingredient || ingredient.name || ingredient}</strong>
                  ${ingredient.roomLocation ? `<br><small>📍 Available in ${ingredient.roomLocation}</small>` : ''}
                  ${!ingredient.available ? '<br><small>⚠️ Need to buy</small>' : ''}
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="section">
            <h2 class="section-title">👨‍🍳 Instructions</h2>
            <ol class="instructions-list">
              ${(recipeData.instructions || []).map((instruction: any) => `
                <li class="instruction">
                  ${instruction.instruction || instruction.description || instruction}
                </li>
              `).join('')}
            </ol>
          </div>

          <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px;">
            Generated by GarageGrid Pro Recipe Generator • ${new Date().toLocaleDateString()}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    
    // Small delay to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)

    toast.success('🖨️ Recipe opened in print dialog!')
  }

  const fetchSavedRecipes = async () => {
    try {
      setLoadingRecipes(true)
      
      // Build query parameters for search and filter
      const params = new URLSearchParams()
      if (recipesSearchQuery.trim()) {
        params.append('search', recipesSearchQuery.trim())
      }
      if (selectedMealTypeFilter && selectedMealTypeFilter !== 'all') {
        params.append('mealType', selectedMealTypeFilter)
      }
      params.append('sortBy', 'createdAt')
      params.append('sortOrder', 'desc')
      params.append('limit', '50')

      console.log('🔍 Fetching saved recipes with params:', params.toString())

      const response = await fetch(`/api/recipes?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recipes: ${response.status}`)
      }

      const data = await response.json()
      
      console.log('✅ Saved recipes fetched:', {
        count: data.recipes?.length || 0,
        total: data.pagination?.totalCount || 0,
        stats: data.stats
      })

      setSavedRecipes(data.recipes || [])
      setRecipeStats(data.stats || null)
      
    } catch (error) {
      console.error('❌ Error fetching saved recipes:', error)
      toast.error('Failed to load saved recipes')
      setSavedRecipes([])
    } finally {
      setLoadingRecipes(false)
    }
  }

  const handleDeleteRecipe = async (recipeId: string, recipeTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${recipeTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete recipe')
      }

      toast.success(`🗑️ "${recipeTitle}" deleted successfully`)
      
      // Refresh the recipes list
      await fetchSavedRecipes()
      
    } catch (error) {
      console.error('❌ Error deleting recipe:', error)
      toast.error('Failed to delete recipe')
    }
  }

  const handleToggleFavorite = async (recipeId: string, currentIsFavorite: boolean) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isFavorite: !currentIsFavorite
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update favorite status')
      }

      toast.success(currentIsFavorite ? '💔 Removed from favorites' : '❤️ Added to favorites')
      
      // Refresh the recipes list
      await fetchSavedRecipes()
      
    } catch (error) {
      console.error('❌ Error updating favorite:', error)
      toast.error('Failed to update favorite status')
    }
  }

  // Direct Quantity Management Functions - Phase 1
  const adjustQuantity = async (item: any, change: number) => {
    const newQuantity = Math.max(0, (item.quantity || 0) + change)
    
    try {
      // Optimistic UI update
      setProcessingItems(prev => new Set(prev).add(item.id))
      
      console.log('🔄 Adjusting quantity:', {
        itemId: item.id,
        itemName: item.name,
        currentQuantity: item.quantity,
        change,
        newQuantity
      })

      const response = await fetch(`/api/items/${item.id}/mark-used`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usageType: 'adjust',
          usageQuantity: Math.abs(change),
          newQuantity: newQuantity
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update quantity')
      }

      // Store action for undo
      const recentAction = {
        id: Date.now().toString(),
        itemId: item.id,
        itemName: item.name,
        type: 'adjust',
        previousQuantity: item.quantity,
        newQuantity: newQuantity,
        change: change,
        timestamp: Date.now()
      }
      
      setRecentActions(prev => [recentAction, ...prev.slice(0, 4)]) // Keep last 5 actions

      // Refresh food inventory
      await fetchFoodInventory()
      
      // Show appropriate message
      const unit = getDisplayUnit(item)
      if (newQuantity === 0) {
        toast.success(`📦 "${item.name}" is now out of stock - kept for restocking`, {
          duration: 4000,
        })
      } else {
        const changeText = change > 0 ? `+${change}` : `${change}`
        toast.success(`✅ ${item.name}: ${item.quantity} ${unit} → ${newQuantity} ${unit} (${changeText})`)
      }

      // Show undo toast briefly  
      setShowUndoToast(true)
      setTimeout(() => setShowUndoToast(false), 5000)

    } catch (error) {
      console.error('❌ Error adjusting quantity:', error)
      toast.error(`Failed to update ${item.name}`)
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  const deleteItem = async (item: any) => {
    try {
      // Optimistic UI update
      setProcessingItems(prev => new Set(prev).add(item.id))
      
      console.log('🗑️ Deleting item:', { itemId: item.id, itemName: item.name })

      const response = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete item')
      }

      // Store action for undo (though delete undo is complex)
      const recentAction = {
        id: Date.now().toString(),
        itemId: item.id,
        itemName: item.name,
        type: 'delete',
        previousItem: { ...item },
        timestamp: Date.now()
      }
      
      setRecentActions(prev => [recentAction, ...prev.slice(0, 4)])

      // Refresh inventory
      await fetchFoodInventory()
      
      toast.success(`🗑️ "${item.name}" deleted completely from inventory`, {
        duration: 4000,
      })

      // Show undo toast briefly
      setShowUndoToast(true)
      setTimeout(() => setShowUndoToast(false), 5000)

    } catch (error) {
      console.error('❌ Error deleting item:', error)
      toast.error(`Failed to delete ${item.name}`)
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  const handleUndoAction = async (actionId: string) => {
    const action = recentActions.find(a => a.id === actionId)
    if (!action) return

    try {
      if (action.type === 'adjust') {
        // Undo quantity adjustment
        const response = await fetch(`/api/items/${action.itemId}/mark-used`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            usageType: 'adjust',
            usageQuantity: Math.abs(action.previousQuantity - action.newQuantity),
            newQuantity: action.previousQuantity
          })
        })

        if (!response.ok) {
          throw new Error('Failed to undo quantity change')
        }

      } else if (action.type === 'delete') {
        // Note: Undoing delete would require recreating the item, 
        // which is complex. For now, we'll just remove from undo list.
        toast.error('Cannot undo item deletion (feature coming soon)')
        setRecentActions(prev => prev.filter(a => a.id !== actionId))
        return
      }

      // Remove from recent actions
      setRecentActions(prev => prev.filter(a => a.id !== actionId))
      
      // Refresh inventory
      await fetchFoodInventory()
      
      toast.success(`⏪ Undid action for "${action.itemName}"`)
      
    } catch (error) {
      console.error('❌ Error undoing action:', error)
      toast.error('Failed to undo action')
    }
  }

  // Phase 1 Option A: Smart Unit Display Helper
  const getDisplayUnit = (item: any) => {
    // If item has explicit unit, use it
    if (item.unit) {
      return item.unit
    }
    
    // Smart unit guessing based on item name/category
    const name = (item.name || '').toLowerCase()
    const category = (item.category || '').toLowerCase()
    
    // Food categories that are typically portioned
    if (category.includes('grain') || name.includes('rice') || name.includes('pasta') || name.includes('cereal')) {
      return 'portions'
    }
    
    // Canned goods are typically whole items
    if (category.includes('canned') || name.includes('can') || name.includes('jar')) {
      return 'cans'
    }
    
    // Fresh produce 
    if (category.includes('produce') || name.includes('apple') || name.includes('banana') || name.includes('orange')) {
      return 'items'
    }
    
    // Liquids
    if (name.includes('milk') || name.includes('juice') || name.includes('water') || category.includes('beverage')) {
      return 'containers'
    }
    
    // Default fallback
    return 'items'
  }

  const getQuantityOptions = (item: any) => {
    const currentQuantity = item.quantity || 1
    const options = []
    
    // Common fractions and whole numbers
    if (currentQuantity >= 0.25) options.push({ value: 0.25, label: '1/4' })
    if (currentQuantity >= 0.5) options.push({ value: 0.5, label: '1/2' })
    if (currentQuantity >= 0.75) options.push({ value: 0.75, label: '3/4' })
    
    for (let i = 1; i <= Math.min(currentQuantity, 10); i++) {
      options.push({ value: i, label: i.toString() })
    }
    
    if (currentQuantity > 10) {
      options.push({ value: currentQuantity, label: 'All' })
    }
    
    return options
  }

  const getTotalFoodItems = () => {
    // Use API stats if available for better accuracy
    if (inventoryStats?.totalItems) {
      return inventoryStats.totalItems
    }
    
    // Fallback to calculating from transformed inventory
    let total = 0
    Object.values(foodInventory).forEach(category => {
      Object.values(category).forEach(items => {
        total += items.length
      })
    })
    return total
  }

  // Filter food inventory based on search query
  const getFilteredFoodInventory = () => {
    if (!pantrySearchQuery.trim()) {
      return foodInventory
    }
    
    const query = pantrySearchQuery.toLowerCase().trim()
    const filtered: any = {}
    
    Object.entries(foodInventory).forEach(([category, rooms]) => {
      Object.entries(rooms).forEach(([roomName, items]) => {
        const matchingItems = items.filter((item: any) => 
          item.name?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          roomName.toLowerCase().includes(query) ||
          item.box?.boxNumber?.toString().includes(query) ||
          item.rack?.rackNumber?.toString().includes(query) ||
          item.rack?.shelfNumber?.toString().includes(query) ||
          item.rack?.spaceNumber?.toString().includes(query)
        )
        
        if (matchingItems.length > 0) {
          if (!filtered[category]) {
            filtered[category] = {}
          }
          filtered[category][roomName] = matchingItems
        }
      })
    })
    
    return filtered
  }

  const getSearchResultsCount = () => {
    if (!pantrySearchQuery.trim()) {
      return getTotalFoodItems()
    }
    
    let total = 0
    const filtered = getFilteredFoodInventory()
    Object.values(filtered).forEach((rooms: any) => {
      Object.values(rooms).forEach((items: any) => {
        total += items.length
      })
    })
    return total
  }

  const getExpiringItemsCount = () => {
    // Use API stats if available for better accuracy
    if (inventoryStats?.expiringSoon !== undefined) {
      return inventoryStats.expiringSoon
    }
    
    // Fallback to calculating from transformed inventory
    let count = 0
    Object.values(foodInventory).forEach(category => {
      Object.values(category).forEach(items => {
        items.forEach(item => {
          if (item.isExpiring) count++
        })
      })
    })
    return count
  }

  const handleStatsNavigation = (statType: 'total' | 'expiring' | 'ready') => {
    switch (statType) {
      case 'total':
        router.push('/expiration-dashboard?tab=all&from=recipe-generator')
        toast.success('🍽️ Viewing all food items in Inventory Tracker')
        break
      case 'expiring':
        router.push('/expiration-dashboard?tab=urgent&from=recipe-generator')
        toast.success('⚠️ Viewing expiring items in Expiration Tracker')
        break
      case 'ready':
        router.push('/expiration-dashboard?tab=fresh&from=recipe-generator')
        toast.success('✅ Viewing fresh items in Fresh Tracker')
        break
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Please Sign In</CardTitle>
            <CardDescription>Sign in to access the Recipe Generator</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <style jsx>{`
        @media print {
          /* Hide everything except the print content */
          body > div:not(#mobile-print-container) { display: none !important; }
          #mobile-print-container { display: block !important; position: static !important; }
        }
      `}</style>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <ChefHat className="h-6 w-6 text-orange-500" />
                <h1 className="text-xl font-bold text-black">Smart Recipe Generator</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 overflow-x-hidden">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-black mb-2">
            Turn Your Ingredients Into Delicious Meals
          </h2>
          <p className="text-gray-600">
            Generate personalized recipes based on your food inventory and preferences
          </p>
        </div>

        {/* Collapsible Stats Section */}
        <div className="mb-6">
          <button 
            onClick={() => setStatsCollapsed(!statsCollapsed)}
            className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Quick Stats</span>
            </div>
            {statsCollapsed ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {!statsCollapsed && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatsNavigation('total')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Food Items</p>
                  <p className="text-2xl font-bold text-black">{getTotalFoodItems()}</p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">View in Inventory Tracker →</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Utensils className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatsNavigation('expiring')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-600">{getExpiringItemsCount()}</p>
                  <p className="text-xs text-orange-600 mt-1 font-medium">View in Expiration Tracker →</p>
                </div>
                <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleStatsNavigation('ready')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ready to Cook</p>
                  <p className="text-2xl font-bold text-green-600">{inventoryStats?.fresh || 0}</p>
                  <p className="text-xs text-green-600 mt-1 font-medium">View in Fresh Tracker →</p>
                </div>
                <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <ChefHat className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          )}
        </div>

        {/* Main Tabs Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full overflow-x-hidden">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 mb-8 h-auto p-2 bg-gray-100 overflow-x-hidden">
            <TabsTrigger 
              value="inventory" 
              className="flex flex-col items-center space-y-1 p-3 h-auto min-h-[60px] data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
            >
              <Filter className="h-5 w-5" />
              <span className="text-xs font-medium">Food Inventory</span>
            </TabsTrigger>
            <TabsTrigger 
              value="generator" 
              className="flex flex-col items-center space-y-1 p-3 h-auto min-h-[60px] data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-medium">Generate Recipe</span>
            </TabsTrigger>
            <TabsTrigger 
              value="preferences" 
              className="flex flex-col items-center space-y-1 p-3 h-auto min-h-[60px] data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
            >
              <Heart className="h-5 w-5" />
              <span className="text-xs font-medium">Preferences</span>
            </TabsTrigger>
            <TabsTrigger 
              value="recipes" 
              className="flex flex-col items-center space-y-1 p-3 h-auto min-h-[60px] data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-medium">My Recipes</span>
            </TabsTrigger>
          </TabsList>

          {/* Food Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6 overflow-x-hidden">
            <Card>
              <CardHeader>
                <CardTitle>Your Food Inventory</CardTitle>
                <CardDescription>
                  Items from your kitchen, pantry, and other rooms that contain food
                </CardDescription>
              </CardHeader>
              
              {/* Dedicated Pantry Search */}
              <div className="px-6 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="🔍 Quick lookup: Search ingredients, spices, rooms, racks, shelves, boxes..."
                    value={pantrySearchQuery}
                    onChange={(e) => setPantrySearchQuery(e.target.value)}
                    className="pl-10 bg-gray-50 border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-blue-500"
                  />
                  {pantrySearchQuery && (
                    <button
                      onClick={() => setPantrySearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {pantrySearchQuery.trim() && (
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>
                      📊 Found {getSearchResultsCount()} item{getSearchResultsCount() !== 1 ? 's' : ''} matching "{pantrySearchQuery}"
                    </span>
                    {getSearchResultsCount() === 0 && (
                      <span className="text-amber-600 font-medium">No matches found</span>
                    )}
                  </div>
                )}
              </div>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : Object.keys(foodInventory).length === 0 ? (
                  <div className="text-center py-12">
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Food Items Found</h3>
                    <p className="text-gray-600 mb-4">
                      Add some food items to your inventory to start generating recipes!
                    </p>
                    <Link href="/items">
                      <Button>Add Food Items</Button>
                    </Link>
                  </div>
                ) : Object.keys(getFilteredFoodInventory()).length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Match Your Search</h3>
                    <p className="text-gray-600 mb-4">
                      Try different keywords or <button
                        onClick={() => setPantrySearchQuery('')}
                        className="text-blue-600 hover:text-blue-700 underline font-medium"
                      >
                        clear your search
                      </button> to see all items.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(getFilteredFoodInventory()).map(([category, rooms]: [string, any]) => (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-lg text-black mb-3 capitalize">
                          {category || 'Uncategorized'}
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(rooms).map(([roomName, items]: [string, any]) => (
                            <div key={roomName} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-700">📍 {roomName}</span>
                                <Badge variant="secondary">{items.length} items</Badge>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {items.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className={`relative p-4 rounded-lg border ${
                                      item.isExpiring
                                        ? 'bg-orange-50 border-orange-200'
                                        : 'bg-white border-gray-200'
                                    } hover:shadow-sm transition-shadow`}
                                  >
                                    {/* Delete Button - Top Right Corner */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                                      onClick={() => deleteItem(item)}
                                      disabled={processingItems.has(item.id)}
                                    >
                                      {processingItems.has(item.id) ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>

                                    {/* Item Info */}
                                    <div className="pr-8 mb-3">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className="font-medium text-sm">{item.name}</span>
                                        {item.isExpiring && (
                                          <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                        )}
                                      </div>
                                      
                                      {/* Enhanced Location Information */}
                                      <div className="text-xs mb-1">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                          📍 {roomName}
                                          {item.rack?.rackNumber && (
                                            <span className="ml-1 text-blue-800"> • Rack {item.rack.rackNumber}</span>
                                          )}
                                          {item.rack?.shelfNumber && (
                                            <span className="ml-1 text-blue-800"> • Shelf {item.rack.shelfNumber}</span>
                                          )}
                                          {item.rack?.spaceNumber && (
                                            <span className="ml-1 text-blue-800"> • Space {item.rack.spaceNumber}</span>
                                          )}
                                          {item.box?.boxNumber && (
                                            <span className="ml-1 text-blue-800"> • Box #{item.box.boxNumber}</span>
                                          )}
                                        </span>
                                      </div>
                                      
                                      {item.quantity && (
                                        <div className="text-xs text-gray-600 font-medium mb-1">
                                          Qty: {item.quantity} {getDisplayUnit(item)}
                                        </div>
                                      )}

                                      {item.daysUntilExpiration !== null && (
                                        <div className="text-xs">
                                          {item.daysUntilExpiration < 0 ? (
                                            <span className="text-red-600 font-medium">
                                              Expired {Math.abs(item.daysUntilExpiration)} days ago
                                            </span>
                                          ) : item.daysUntilExpiration === 0 ? (
                                            <span className="text-orange-600 font-medium">
                                              Expires today
                                            </span>
                                          ) : (
                                            <span className={item.isExpiring ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                                              Expires in {item.daysUntilExpiration} days
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Centered Quantity Controls */}
                                    <div className="flex justify-center">
                                      <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 hover:bg-gray-100"
                                          onClick={() => adjustQuantity(item, -1)}
                                          disabled={processingItems.has(item.id) || (item.quantity || 0) <= 0}
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                        
                                        <div className="px-2 text-sm font-medium w-12 text-center">
                                          {processingItems.has(item.id) ? (
                                            <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mx-auto"></div>
                                          ) : (
                                            <span className={`${(item.quantity || 0) === 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                                              {item.quantity || 0}
                                            </span>
                                          )}
                                          <div className="text-xs text-gray-500">{getDisplayUnit(item)}</div>
                                        </div>
                                        
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 hover:bg-gray-100"
                                          onClick={() => adjustQuantity(item, 1)}
                                          disabled={processingItems.has(item.id)}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Out of Stock Indicator */}
                                    {(item.quantity || 0) === 0 && (
                                      <div className="mt-2 text-center">
                                        <div className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded border border-orange-200">
                                          Out of Stock
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6 overflow-x-hidden">
            {/* Preferences Introduction */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-blue-600" />
                  Set Your Recipe Preferences
                </CardTitle>
                <CardDescription>
                  Tell us what you're in the mood for! Set your preferences below and we'll create personalized recipes using your 76 available ingredients.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meal Type & Protein */}
              <Card>
                <CardHeader>
                  <CardTitle>Meal & Protein Base</CardTitle>
                  <CardDescription>Choose your meal type and protein preference</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Meal Type</Label>
                    <Select value={preferences.mealType} onValueChange={(value) => updatePreference('mealType', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select meal type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Protein Base</Label>
                    <Select value={preferences.proteinBase} onValueChange={(value) => updatePreference('proteinBase', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select protein base" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROTEIN_BASES.map(protein => (
                          <SelectItem key={protein.value} value={protein.value}>
                            {protein.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Complexity & Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Complexity & Time</CardTitle>
                  <CardDescription>Set cooking complexity and time constraints</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Complexity Level</Label>
                    <Select value={preferences.complexity} onValueChange={(value) => updatePreference('complexity', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select complexity" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLEXITY_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            <div>
                              <div className="font-medium">{level.label}</div>
                              <div className="text-xs text-gray-500">{level.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Time Constraint</Label>
                    <Select value={preferences.timeConstraint} onValueChange={(value) => updatePreference('timeConstraint', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select time limit" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_CONSTRAINTS.map(time => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Dietary Restrictions */}
              <Card>
                <CardHeader>
                  <CardTitle>Dietary Preferences</CardTitle>
                  <CardDescription>Select any dietary restrictions or preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {DIETARY_OPTIONS.map(option => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={preferences.dietaryRestrictions.includes(option.id)}
                          onCheckedChange={() => toggleDietaryRestriction(option.id)}
                        />
                        <Label htmlFor={option.id} className="text-sm flex items-center space-x-1">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Serving Size & Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Options</CardTitle>
                  <CardDescription>Set serving size and special preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Serving Size</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={preferences.servingSize}
                        onChange={(e) => updatePreference('servingSize', parseInt(e.target.value) || 1)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">people</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use-expiring"
                      checked={preferences.useExpiringFirst}
                      onCheckedChange={(checked) => updatePreference('useExpiringFirst', checked)}
                    />
                    <Label htmlFor="use-expiring" className="text-sm flex items-center space-x-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>Prioritize expiring ingredients</span>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preferences Summary & Save */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Star className="h-5 w-5 mr-2 text-green-600" />
                    Preferences Summary
                  </span>
                  {preferences.mealType && preferences.proteinBase && preferences.complexity && preferences.timeConstraint && (
                    <Badge className="bg-green-600 text-white">
                      <Check className="h-4 w-4 mr-1" />
                      Complete
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Review your preferences and generate recipes using your available ingredients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Preferences Display */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Meal Type</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {preferences.mealType ? MEAL_TYPES.find(t => t.value === preferences.mealType)?.label : 'Not set'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Protein</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {preferences.proteinBase ? PROTEIN_BASES.find(p => p.value === preferences.proteinBase)?.label : 'Not set'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Complexity</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {preferences.complexity ? COMPLEXITY_LEVELS.find(c => c.value === preferences.complexity)?.label : 'Not set'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Time Limit</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {preferences.timeConstraint ? TIME_CONSTRAINTS.find(t => t.value === preferences.timeConstraint)?.label : 'Not set'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setActiveTab('generator')
                      toast.success('✨ Ready to generate recipes with your preferences!')
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <ChefHat className="h-5 w-5 mr-2" />
                    Go Generate Recipes!
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreferences({
                        mealType: 'no-preference',
                        proteinBase: 'no-preference',
                        complexity: 'no-preference',
                        timeConstraint: 'no-preference',
                        dietaryRestrictions: ['no-preference'],
                        servingSize: 4,
                        useExpiringFirst: true
                      })
                      toast.success('🔄 Preferences reset to "No Preference" defaults!')
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recipe Generator Tab */}
          <TabsContent value="generator" className="space-y-6 overflow-x-hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span>Generate Your Recipe</span>
                </CardTitle>
                <CardDescription>
                  Ready to create something delicious? Let's generate a recipe based on your preferences!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preference Summary & Quick Setup */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-blue-600" />
                      Your Recipe Preferences
                    </h4>
                    {(!preferences.mealType || !preferences.proteinBase || !preferences.complexity || !preferences.timeConstraint) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTab('preferences')}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Set Preferences
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Meal:</span>
                      <Badge variant={preferences.mealType ? 'default' : 'secondary'}>
                        {preferences.mealType ? MEAL_TYPES.find(t => t.value === preferences.mealType)?.label : 'Not set'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Protein:</span>
                      <Badge variant={preferences.proteinBase ? 'default' : 'secondary'}>
                        {preferences.proteinBase ? PROTEIN_BASES.find(p => p.value === preferences.proteinBase)?.label : 'Not set'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Time:</span>
                      <Badge variant={preferences.timeConstraint ? 'default' : 'secondary'}>
                        {preferences.timeConstraint ? TIME_CONSTRAINTS.find(t => t.value === preferences.timeConstraint)?.label : 'Not set'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Servings:</span>
                      <Badge variant="default" className="bg-blue-600">
                        {preferences.servingSize}
                      </Badge>
                    </div>
                  </div>
                  
                  {preferences.dietaryRestrictions.length > 0 && (
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-600">Dietary:</span>
                      {preferences.dietaryRestrictions.map(restriction => (
                        <Badge key={restriction} variant="outline">
                          {DIETARY_OPTIONS.find(d => d.id === restriction)?.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Recipe generation is always ready with flexible preferences */}
                  <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Recipe Generator Ready</p>
                      <p className="text-sm text-green-700 mt-1">
                        Generate recipes with your current preferences, or customize them in the{" "}
                        <button 
                          onClick={() => setActiveTab('preferences')}
                          className="underline font-medium hover:text-green-900 transition-colors"
                        >
                          Preferences tab
                        </button>{" "}
                        for more personalized results. "No Preference" gives the AI creative freedom!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Generate Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleGenerateRecipe}
                    disabled={isGenerating}
                    className="flex-1 h-14 text-lg font-semibold"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Recipe...
                      </>
                    ) : (
                      <>
                        <ChefHat className="h-5 w-5 mr-2" />
                        Generate Recipe
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      // Random preferences for meal lottery
                      const randomMeal = MEAL_TYPES[Math.floor(Math.random() * MEAL_TYPES.length)]
                      const randomProtein = PROTEIN_BASES[Math.floor(Math.random() * PROTEIN_BASES.length)]
                      const randomComplexity = COMPLEXITY_LEVELS[Math.floor(Math.random() * COMPLEXITY_LEVELS.length)]
                      const randomTime = TIME_CONSTRAINTS[Math.floor(Math.random() * TIME_CONSTRAINTS.length)]
                      
                      setPreferences(prev => ({
                        ...prev,
                        mealType: randomMeal.value,
                        proteinBase: randomProtein.value,
                        complexity: randomComplexity.value,
                        timeConstraint: randomTime.value
                      }))
                      
                      toast.success('🎲 Surprise recipe preferences set!')
                      setTimeout(() => handleGenerateRecipe(), 500)
                    }}
                    variant="outline"
                    disabled={isGenerating}
                    className="flex-1 h-14 text-lg font-semibold"
                    size="lg"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    🎲 Surprise Me!
                  </Button>
                </div>

                {getTotalFoodItems() === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">No Food Items Found</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Add some food items to your inventory for better recipe suggestions.
                        </p>
                        <Link href="/items" className="inline-block mt-2">
                          <Button size="sm" variant="outline">
                            Add Food Items
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recipe Generation Status */}
                {isGenerating && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">AI Chef is cooking up something amazing...</h3>
                      <p className="text-gray-600 mb-4">
                        Analyzing your ingredients and creating the perfect recipe for you!
                      </p>
                      {generationProgress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${generationProgress}%` }}
                          ></div>
                        </div>
                      )}
                      <p className="text-sm text-gray-500">{generationProgress}% complete</p>
                    </div>
                  </div>
                )}

                {/* Generated Recipe Display */}
                {generatedRecipe && !isGenerating && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center">
                            <ChefHat className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">{generatedRecipe.title}</h3>
                            <p className="text-gray-600">{generatedRecipe.description}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {/* Generate New Button - Top Row */}
                          <div className="flex justify-start">
                            <Button
                              onClick={() => setGeneratedRecipe(null)}
                              variant="outline"
                              size="sm"
                            >
                              Generate New
                            </Button>
                          </div>
                          
                          {/* Save & Print Buttons - Bottom Row */}
                          <div className="flex items-center space-x-3">
                            <Button 
                              size="sm"
                              onClick={handleSaveRecipe}
                              disabled={isSavingRecipe}
                            >
                              {isSavingRecipe ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Heart className="h-4 w-4 mr-2" />
                                  Save Recipe
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handlePrintRecipe}
                              className="border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Recipe Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <Clock className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                          <p className="text-sm font-medium text-gray-700">Prep Time</p>
                          <p className="text-xs text-gray-600">{generatedRecipe.prepTime}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <Timer className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                          <p className="text-sm font-medium text-gray-700">Cook Time</p>
                          <p className="text-xs text-gray-600">{generatedRecipe.cookTime}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <Users className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                          <p className="text-sm font-medium text-gray-700">Servings</p>
                          <p className="text-xs text-gray-600">{generatedRecipe.servings}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <Star className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                          <p className="text-sm font-medium text-gray-700">Difficulty</p>
                          <p className="text-xs text-gray-600">{generatedRecipe.difficulty}</p>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {generatedRecipe.tags?.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Ingredients & Instructions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Ingredients */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Utensils className="h-5 w-5 text-green-500" />
                            <span>Ingredients</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {generatedRecipe.ingredients?.map((ingredient: any, index: number) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg border ${
                                  ingredient.available
                                    ? ingredient.expiring
                                      ? 'bg-orange-50 border-orange-200'
                                      : 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <span className="font-medium">
                                      {ingredient.amount} {ingredient.name}
                                    </span>
                                    {ingredient.roomLocation && (
                                      <p className="text-sm text-gray-500">
                                        📍 Available in {ingredient.roomLocation}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {ingredient.available ? (
                                      <>
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-xs text-green-600">Available</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                        <span className="text-xs text-gray-600">Need to buy</span>
                                      </>
                                    )}
                                    {ingredient.expiring && (
                                      <AlertTriangle className="h-4 w-4 text-orange-500 ml-1" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Missing Ingredients */}
                          {generatedRecipe.missingIngredients?.length > 0 && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Shopping List ({generatedRecipe.missingIngredients.length} items)
                              </h4>
                              <div className="text-sm text-yellow-700">
                                {generatedRecipe.missingIngredients.join(', ')}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Instructions */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <ChefHat className="h-5 w-5 text-blue-500" />
                            <span>Instructions</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {generatedRecipe.instructions?.map((instruction: any, index: number) => (
                              <div key={index} className="flex space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                    {instruction.step}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="text-gray-900 mb-1">{instruction.description}</p>
                                  {instruction.tips && (
                                    <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded italic">
                                      💡 Tip: {instruction.tips}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Nutrition Info */}
                      {generatedRecipe.nutritionInfo && Object.keys(generatedRecipe.nutritionInfo).length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Nutrition Information</CardTitle>
                            <CardDescription>Per serving estimates</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              {Object.entries(generatedRecipe.nutritionInfo).map(([key, value]) => (
                                <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm font-medium text-gray-700 capitalize">{key}</p>
                                  <p className="text-lg font-bold text-gray-900">{value as string}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Chef Tips */}
                      {generatedRecipe.chefTips?.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center space-x-2">
                              <ChefHat className="h-5 w-5 text-orange-500" />
                              <span>Chef's Tips</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {generatedRecipe.chefTips.map((tip: string, index: number) => (
                                <div key={index} className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <p className="text-sm text-gray-700">{tip}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Recipes Tab */}
          <TabsContent value="recipes" className="space-y-6 overflow-x-hidden">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                  <span>My Recipe Collection</span>
                  {recipeStats?.totalRecipes > 0 && (
                    <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-300">
                      {recipeStats.totalRecipes} recipe{recipeStats.totalRecipes !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  View, search, and manage your saved recipe collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  {/* Search Input */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search your recipes..."
                      value={recipesSearchQuery}
                      onChange={(e) => {
                        setRecipesSearchQuery(e.target.value)
                        // Debounced search will be handled by useEffect
                      }}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Meal Type Filter */}
                  <div className="w-full sm:w-48">
                    <Select value={selectedMealTypeFilter} onValueChange={setSelectedMealTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Meal Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Meal Types</SelectItem>
                        <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                        <SelectItem value="lunch">🌞 Lunch</SelectItem>
                        <SelectItem value="dinner">🌙 Dinner</SelectItem>
                        <SelectItem value="snack">🥨 Snack</SelectItem>
                        <SelectItem value="dessert">🍰 Dessert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Search Button */}
                  <Button 
                    onClick={() => fetchSavedRecipes()}
                    disabled={loadingRecipes}
                    className="shrink-0"
                  >
                    {loadingRecipes ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search
                  </Button>
                </div>

                {/* Recipe Stats */}
                {recipeStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                      <div className="text-2xl font-bold text-emerald-700">{recipeStats.totalRecipes}</div>
                      <div className="text-sm text-emerald-600">Total Recipes</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-700">{recipeStats.favoriteCount || 0}</div>
                      <div className="text-sm text-red-600">Favorites</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-700">{recipeStats.recentlyCooked || 0}</div>
                      <div className="text-sm text-blue-600">Recently Cooked</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                      <div className="text-2xl font-bold text-purple-700">
                        {recipeStats.mealTypeBreakdown?.length || 0}
                      </div>
                      <div className="text-sm text-purple-600">Meal Types</div>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {loadingRecipes && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                      <p className="text-gray-600">Loading your recipes...</p>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loadingRecipes && savedRecipes.length === 0 && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <BookOpen className="h-12 w-12 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-gray-900">No recipes yet</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Start generating and saving recipes to build your personal collection! 
                        Go to the <strong>Generate Recipe</strong> tab to create your first recipe.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setActiveTab('generator')}
                      className="mt-4"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate First Recipe
                    </Button>
                  </div>
                )}

                {/* Recipe Cards */}
                {!loadingRecipes && savedRecipes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-emerald-300"
                      >
                        {/* Recipe Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
                              {recipe.title}
                            </h3>
                            {recipe.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {recipe.description}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleFavorite(recipe.id, recipe.isFavorite)}
                            className={`shrink-0 ml-2 ${recipe.isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                          >
                            <Heart className={`h-4 w-4 ${recipe.isFavorite ? 'fill-current' : ''}`} />
                          </Button>
                        </div>

                        {/* Recipe Info */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>{recipe.prepTime || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Recipe Tags */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {recipe.mealType && (
                            <Badge variant="secondary" className="text-xs">
                              {recipe.mealType}
                            </Badge>
                          )}
                          {recipe.difficulty && (
                            <Badge variant="outline" className="text-xs">
                              {recipe.difficulty}
                            </Badge>
                          )}
                          {recipe.tags && recipe.tags.slice(0, 2).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* Recipe Actions */}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Saved {new Date(recipe.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handlePrintRecipe(recipe)}
                              title="Print Recipe"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-600 hover:text-gray-900"
                              onClick={() => {
                                // View recipe details - could expand or show in modal
                                toast('Recipe details view coming soon!')
                              }}
                              title="View Recipe"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteRecipe(recipe.id, recipe.title)}
                              title="Delete Recipe"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Load More Button (if needed) */}
                {!loadingRecipes && savedRecipes.length > 0 && savedRecipes.length % 50 === 0 && (
                  <div className="text-center mt-8">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        // Implement pagination if needed
                        toast('Load more functionality coming soon!')
                      }}
                    >
                      Load More Recipes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Phase 1: Modal system removed - using direct inline controls instead */}

        {/* Undo Toast - Fixed Position */}
        {showUndoToast && recentActions.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Undo2 className="h-4 w-4" />
                  <span className="text-sm">Action completed</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-gray-700 h-6 px-2 text-xs"
                  onClick={() => handleUndoAction(recentActions[0].id)}
                >
                  Undo
                </Button>
              </div>
              <div className="text-xs text-gray-300 mt-1">
                {recentActions[0]?.itemName}
              </div>
            </div>
          </div>
        )}


      </main>
    </div>
  )
}

// Phase 1: Old modal components removed - now using inline direct controls

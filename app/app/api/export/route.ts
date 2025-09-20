
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Helper function to convert items to CSV format
function convertToCSV(items: any[], type: string) {
  console.log(`🔄 convertToCSV called with ${items.length} items, type: ${type}`)
  
  if (items.length === 0) {
    console.log(`⚠️ No items provided to convertToCSV for type: ${type}`)
    return 'No items found for export'
  }

  // Handle insurance report - calculate totals and provide summary
  if (type === 'insurance') {
    console.log(`📋 Generating insurance report for ${items.length} items`)
    return generateInsuranceReport(items)
  }

  // Handle location report - organized by room/location  
  if (type === 'location') {
    console.log(`📍 Generating location report for ${items.length} items`)
    return generateLocationReport(items)
  }

  console.log(`📊 Generating standard CSV for type: ${type}`)

  // Define headers based on export type
  const headers = [
    'Name',
    'Description', 
    'Category',
    'Quantity',
    'Value',
    'Condition',
    'Location',
    'Room',
    'Box',
    'Status',
    'Serial Number',
    'Purchase Date',
    'Notes',
    'Created Date',
    'Updated Date'
  ]

  // Add donation-specific headers
  if (type === 'donation') {
    headers.push('Days in Inventory', 'Last Activity', 'Donation Score')
  }

  // Add food-specific headers for relevant exports
  if (type === 'all' || type === 'food') {
    headers.push('Is Food', 'Food Category', 'Food Unit', 'Expiration Date')
  }

  const csvContent = [
    headers.join(','),
    ...items.map(item => {
      try {
        const baseRow = [
          `"${(item.name || '').replace(/"/g, '""')}"`,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          `"${(item.category || '').replace(/"/g, '""')}"`,
          item.quantity || 0,
          item.value || 0,
          `"${(item.condition || '').replace(/"/g, '""')}"`,
          `"${(item.location || '').replace(/"/g, '""')}"`,
          `"${(item.room?.name || '').replace(/"/g, '""')}"`,
          `"${(item.box?.name || item.box?.boxNumber || '').replace(/"/g, '""')}"`,
          `"${(item.status || 'AVAILABLE').replace(/"/g, '""')}"`,
          `"${(item.serialNumber || '').replace(/"/g, '""')}"`,
          item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '',
          `"${(item.notes || '').replace(/"/g, '""')}"`,
          item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
          item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''
        ]

        // Add donation-specific data
        if (type === 'donation') {
          const daysInInventory = Math.floor((Date.now() - new Date(item.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))
          const daysSinceUpdate = Math.floor((Date.now() - new Date(item.updatedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))
          const donationScore = calculateDonationScore(item, daysInInventory, daysSinceUpdate)
          
          baseRow.push(
            daysInInventory.toString(),
            item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '',
            donationScore.toString()
          )
        }

        // Add food-specific data
        if (type === 'all' || type === 'food') {
          baseRow.push(
            item.isFood ? 'Yes' : 'No',
            `"${(item.foodCategory || '').replace(/"/g, '""')}"`,
            `"${(item.foodUnit || '').replace(/"/g, '""')}"`,
            item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : ''
          )
        }

        return baseRow.join(',')
      } catch (rowError) {
        console.error(`❌ Error processing item ${item.id || 'unknown'}:`, rowError)
        
        // Create a fallback row with correct number of columns based on export type
        let fallbackRow = [
          `"${item.name || 'Unknown Item'}"`,
          '"Error processing item"',
          '""', '""', '""', '""', '""', '""', '""', '""', '""', '""', '""', '""', '""'
        ]
        
        // Add extra columns for donation type
        if (type === 'donation') {
          fallbackRow.push('""', '""', '""')
        }
        
        // Add extra columns for food/all types  
        if (type === 'all' || type === 'food') {
          fallbackRow.push('""', '""', '""', '""')
        }
        
        return fallbackRow.join(',')
      }
    })
  ].join('\n')

  console.log(`✅ Standard CSV generated: ${csvContent.split('\n').length} lines, ${csvContent.length} characters`)
  return csvContent
}

// Generate insurance report with totals and categories
function generateInsuranceReport(items: any[]): string {
  // Calculate total value
  const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0)
  
  // Group by category for breakdown
  const categoryTotals: { [key: string]: { count: number, value: number } } = {}
  const roomTotals: { [key: string]: { count: number, value: number } } = {}
  
  items.forEach(item => {
    const category = item.category || 'Uncategorized'
    const room = item.room?.name || 'Unassigned'
    
    if (!categoryTotals[category]) {
      categoryTotals[category] = { count: 0, value: 0 }
    }
    categoryTotals[category].count += item.quantity || 1
    categoryTotals[category].value += item.value || 0
    
    if (!roomTotals[room]) {
      roomTotals[room] = { count: 0, value: 0 }
    }
    roomTotals[room].count += item.quantity || 1
    roomTotals[room].value += item.value || 0
  })
  
  // Generate the insurance report CSV
  const report = []
  
  // Summary section
  report.push('HOUSEHOLD CONTENTS INSURANCE VALUATION REPORT')
  report.push('Generated on: ' + new Date().toLocaleDateString())
  report.push('')
  
  // Executive Summary
  report.push('EXECUTIVE SUMMARY')
  report.push('Total Items,' + items.length)
  report.push('Total Estimated Value,"$' + totalValue.toLocaleString() + '"')
  report.push('Recommended Coverage Amount,"$' + Math.ceil(totalValue * 1.2).toLocaleString() + '"')
  report.push('(Recommended coverage includes 20% buffer for replacement costs)')
  report.push('')
  
  // Category breakdown
  report.push('VALUE BY CATEGORY')
  report.push('Category,Item Count,Total Value,Percentage of Total')
  Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b.value - a.value)
    .forEach(([category, data]) => {
      const percentage = ((data.value / totalValue) * 100).toFixed(1)
      report.push(`"${category}",${data.count},"$${data.value.toLocaleString()}",${percentage}%`)
    })
  
  report.push('')
  
  // Room breakdown  
  report.push('VALUE BY LOCATION')
  report.push('Room/Location,Item Count,Total Value,Percentage of Total')
  Object.entries(roomTotals)
    .sort(([,a], [,b]) => b.value - a.value)
    .forEach(([room, data]) => {
      const percentage = ((data.value / totalValue) * 100).toFixed(1)
      report.push(`"${room}",${data.count},"$${data.value.toLocaleString()}",${percentage}%`)
    })
  
  report.push('')
  
  // Detailed inventory for insurance purposes
  report.push('DETAILED INVENTORY')
  report.push('Item Name,Category,Room,Quantity,Unit Value,Total Value,Serial Number,Purchase Date,Condition,Description')
  
  items
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .forEach(item => {
      report.push([
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.category || '').replace(/"/g, '""')}"`,
        `"${(item.room?.name || '').replace(/"/g, '""')}"`,
        item.quantity || 1,
        `"$${(item.value || 0).toLocaleString()}"`,
        `"$${((item.value || 0) * (item.quantity || 1)).toLocaleString()}"`,
        `"${(item.serialNumber || '').replace(/"/g, '""')}"`,
        item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '',
        `"${(item.condition || '').replace(/"/g, '""')}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`
      ].join(','))
    })
  
  return report.join('\n')
}

// Generate location-organized report
function generateLocationReport(items: any[]): string {
  // Group items by room first, then by specific location within room
  const locationGroups: { [key: string]: any[] } = {}
  
  items.forEach(item => {
    const roomName = item.room?.name || 'Unassigned Room'
    const location = item.location || 'General Area'
    const boxInfo = item.box ? ` - Box ${item.box.boxNumber}${item.box.name ? ` (${item.box.name})` : ''}` : ''
    
    const fullLocation = `${roomName} > ${location}${boxInfo}`
    
    if (!locationGroups[fullLocation]) {
      locationGroups[fullLocation] = []
    }
    locationGroups[fullLocation].push(item)
  })
  
  const report = []
  
  // Header
  report.push('INVENTORY BY LOCATION REPORT')
  report.push('Generated on: ' + new Date().toLocaleDateString())
  report.push('')
  
  // Summary by location
  report.push('LOCATION SUMMARY')
  report.push('Location,Item Count,Total Value')
  
  Object.entries(locationGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([location, locationItems]) => {
      const totalValue = locationItems.reduce((sum, item) => sum + (item.value || 0), 0)
      report.push(`"${location}",${locationItems.length},"$${totalValue.toLocaleString()}"`)
    })
  
  report.push('')
  
  // Detailed items by location
  report.push('DETAILED INVENTORY BY LOCATION')
  
  Object.entries(locationGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([location, locationItems]) => {
      const totalValue = locationItems.reduce((sum, item) => sum + (item.value || 0), 0)
      
      report.push('')
      report.push(`=== ${location.toUpperCase()} ===`)
      report.push(`Total Items: ${locationItems.length} | Total Value: $${totalValue.toLocaleString()}`)
      report.push('')
      report.push('Item Name,Description,Category,Quantity,Value,Condition,Serial Number,Purchase Date,Notes')
      
      locationItems
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(item => {
          report.push([
            `"${(item.name || '').replace(/"/g, '""')}"`,
            `"${(item.description || '').replace(/"/g, '""')}"`,
            `"${(item.category || '').replace(/"/g, '""')}"`,
            item.quantity || 1,
            `"$${(item.value || 0).toLocaleString()}"`,
            `"${(item.condition || '').replace(/"/g, '""')}"`,
            `"${(item.serialNumber || '').replace(/"/g, '""')}"`,
            item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '',
            `"${(item.notes || '').replace(/"/g, '""')}"`
          ].join(','))
        })
    })
  
  return report.join('\n')
}

// Helper function to calculate donation score (0-100, higher = better donation candidate)
function calculateDonationScore(item: any, daysInInventory: number, daysSinceUpdate: number): number {
  let score = 0
  
  // Age factor (older items score higher)
  if (daysInInventory > 365) score += 40  // Over a year
  else if (daysInInventory > 180) score += 30  // 6-12 months  
  else if (daysInInventory > 90) score += 20   // 3-6 months
  else score += 10
  
  // Unused factor (items never or rarely accessed)
  if (daysSinceUpdate > 180) score += 30
  else if (daysSinceUpdate > 90) score += 20
  else if (daysSinceUpdate > 30) score += 10
  
  // Status factor (available items are better donation candidates)
  if (item.status === 'AVAILABLE') score += 20
  
  // Location factor (garage/storage items are better candidates)
  const locationLower = (item.location || '').toLowerCase()
  const roomNameLower = (item.room?.name || '').toLowerCase()
  if (locationLower.includes('garage') || roomNameLower.includes('garage') || 
      locationLower.includes('storage') || roomNameLower.includes('storage') ||
      locationLower.includes('attic') || roomNameLower.includes('attic')) {
    score += 10
  }
  
  return Math.min(100, score)
}

// GET /api/export - Export items based on parameters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get('type') || 'all' // all, category, value, donation, insurance, location
    const format = searchParams.get('format') || 'csv' // csv, excel
    const category = searchParams.get('category')
    const minValue = searchParams.get('minValue')
    const maxValue = searchParams.get('maxValue')
    const roomId = searchParams.get('roomId')
    const donationDays = parseInt(searchParams.get('donationDays') || '90') // Items unused for X days

    console.log(`🔄 Export API called:`, { 
      exportType, 
      format, 
      category, 
      minValue, 
      maxValue, 
      roomId, 
      donationDays,
      userEmail: session.user.email 
    })

    // Build the where clause based on export type (shared data access)
    let whereClause: any = {
      isActive: true // Shared data access - no userId filter
    }

    // Apply filters based on export type
    switch (exportType) {
      case 'category':
        if (category && category !== 'all') {
          whereClause.category = category
        }
        break
        
      case 'value':
        const valueFilter: any = {}
        if (minValue) valueFilter.gte = parseFloat(minValue)
        if (maxValue) valueFilter.lte = parseFloat(maxValue)
        if (Object.keys(valueFilter).length > 0) {
          whereClause.value = valueFilter
        }
        break
        
      case 'donation':
        // Items that haven't been updated recently and are available
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - donationDays)
        whereClause.updatedAt = { lte: cutoffDate }
        whereClause.status = 'AVAILABLE'
        break
        
      case 'food':
        whereClause.isFood = true
        break
        
      case 'insurance':
        // For insurance report, we want all items with values
        whereClause.value = { gt: 0 }
        break
        
      case 'location':
        // For location report, we want all items organized by location
        // No additional filtering needed - we'll handle organization in the CSV function
        break
    }

    // Apply room filter if specified
    if (roomId && roomId !== 'all') {
      whereClause.roomId = roomId
    }

    // Fetch items with related data
    const items = await prisma.item.findMany({
      where: whereClause,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        box: {
          select: {
            id: true,
            boxNumber: true,
            name: true
          }
        }
      },
      orderBy: [
        { room: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    console.log(`📊 Query results:`, { 
      itemCount: items.length, 
      exportType, 
      whereClause: JSON.stringify(whereClause, null, 2) 
    })

    if (items.length === 0) {
      console.log(`❌ No items found for export type: ${exportType}`)
      return NextResponse.json({ 
        message: 'No items found for export with the specified criteria',
        count: 0,
        exportType,
        criteria: whereClause
      })
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const exportLabel = exportType === 'all' ? 'inventory' : 
                       exportType === 'donation' ? 'donation-candidates' :
                       exportType === 'value' ? 'value-report' :
                       exportType === 'insurance' ? 'insurance-coverage' :
                       exportType === 'location' ? 'inventory-by-location' :
                       exportType === 'category' ? `category-${category}` :
                       exportType

    const filename = `garagegrid-${exportLabel}-${timestamp}.${format}`

    if (format === 'csv') {
      console.log(`📋 Generating CSV for ${exportType} with ${items.length} items`)
      const csvContent = convertToCSV(items, exportType)
      console.log(`✅ CSV generated, length: ${csvContent.length} characters`)
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      })
    }

    // For now, return JSON for Excel format (can be enhanced later with actual Excel generation)
    return NextResponse.json({
      success: true,
      exportType,
      format,
      filename,
      count: items.length,
      items: items.map(item => ({
        ...item,
        donationScore: exportType === 'donation' ? calculateDonationScore(
          item, 
          Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
        ) : undefined
      }))
    })

  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

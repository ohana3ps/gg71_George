
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const scanMode = formData.get('scanMode') as string || 'single'

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer()
    const base64String = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageFile.type

    // Prepare the prompt based on scan mode
    const systemPrompt = scanMode === 'batch' 
      ? `You are an expert inventory assistant specializing in identifying garage and storage items from photos. Your task is to carefully examine the image and identify EVERY distinct item visible, no matter how small or partially hidden.

         SCANNING INSTRUCTIONS:
         - Look systematically across the entire image from left to right, top to bottom
         - Identify each individual item, including items that are:
           * Partially visible or in the background
           * Small tools, hardware, or accessories
           * Items inside containers or on shelves
           * Multiple instances of similar items (count them separately)
         - Be thorough - users rely on complete inventories
         - If you see a collection (like a tool set), identify individual components when possible
         - Don't overlook common garage items like screws, bolts, small parts, etc.

         For EACH item you identify, provide:
         - name: Specific, descriptive name (e.g., "Phillips Head Screwdriver #2" not just "screwdriver")
         - description: Detailed description including brand, color, size, model, condition
         - category: One of: Tools, Automotive, Sports & Recreation, Garden & Lawn, Storage & Organization, Cleaning Supplies, Home Improvement, Electronics, Seasonal Items, Miscellaneous
         - quantity: Exact count of this specific item (if multiple identical items, count each one)
         - condition: New, Excellent, Good, Fair, Poor, or Broken
         - estimatedValue: Realistic market value in USD (research typical prices)
         - confidence: Your certainty about this identification (0.0 to 1.0)

         IMPORTANT: Return EMPTY array if no items are clearly identifiable. Quality over quantity - only include items you can identify with reasonable confidence.

         Respond in JSON format with an array of items.
         
         Example response:
         {
           "items": [
             {
               "name": "DeWalt 20V Max Cordless Drill",
               "description": "Yellow and black cordless drill with battery pack attached, model DCD771C2",
               "category": "Tools",
               "quantity": 1,
               "condition": "Good", 
               "estimatedValue": 75.00,
               "confidence": 0.92
             },
             {
               "name": "Claw Hammer",
               "description": "16oz claw hammer with wooden handle, some wear on handle grip",
               "category": "Tools",
               "quantity": 1,
               "condition": "Good",
               "estimatedValue": 12.00,
               "confidence": 0.88
             }
           ]
         }`
      : `You are an AI assistant that analyzes images to identify a single garage/storage item for inventory management.
         Look at the image and identify the main/primary item.
         
         Provide details for the main item:
         - name: Clear, descriptive name
         - description: Brief description including color, size, condition details  
         - category: One of: Tools, Automotive, Sports & Recreation, Garden & Lawn, Storage & Organization, Cleaning Supplies, Home Improvement, Electronics, Seasonal Items, Miscellaneous
         - quantity: How many of this item you can see
         - condition: New, Excellent, Good, Fair, Poor, or Broken
         - estimatedValue: Rough estimate in USD (can be null if unclear)
         - confidence: Your confidence level (0.0 to 1.0)

         Respond in JSON format with a single item in an array.
         
         Example response:
         {
           "items": [
             {
               "name": "Power Drill",
               "description": "Cordless power drill with battery pack, black and yellow",
               "category": "Tools",
               "quantity": 1, 
               "condition": "Good",
               "estimatedValue": 75.00,
               "confidence": 0.9
             }
           ]
         }`

    const messages = [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: systemPrompt
          },
          {
            type: "image_url" as const,
            image_url: {
              url: `data:${mimeType};base64,${base64String}`
            }
          }
        ]
      }
    ]

    console.log(`🔍 Starting ${scanMode} mode scan for image: ${imageFile.name}`)
    
    // Call the LLM API with streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        stream: true,
        max_tokens: 3000, // Increased for batch mode
        response_format: { type: "json_object" },
        temperature: 0.3 // Lower temperature for more consistent results
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ LLM API error ${response.status}:`, errorText)
      throw new Error(`LLM API error: ${response.status} - ${errorText}`)
    }

    console.log(`✅ LLM API responded successfully for ${scanMode} scan`)

    // Stream the response back
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ''
        let partialRead = ''

        try {
          while (true) {
            const { done, value } = await reader?.read() || {}
            if (done) break

            partialRead += decoder.decode(value, { stream: true })
            let lines = partialRead.split('\n')
            partialRead = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  // Process final result
                  try {
                    const finalResult = JSON.parse(buffer)
                    const itemCount = finalResult.items?.length || 0
                    console.log(`📊 ${scanMode} scan completed: Found ${itemCount} items`)
                    if (itemCount === 0) {
                      console.log(`⚠️ No items found in ${scanMode} scan - this might indicate an issue with the image or prompt`)
                    } else {
                      console.log(`🎯 Items identified:`, finalResult.items.map((item: any) => item.name))
                    }
                    
                    const finalData = JSON.stringify({
                      status: 'completed',
                      result: finalResult
                    })
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                  } catch (e) {
                    console.error(`❌ Failed to parse AI response:`, e)
                    console.error(`📄 Raw buffer content:`, buffer)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      status: 'error',
                      message: 'Failed to parse AI response'
                    })}\n\n`))
                  }
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  buffer += parsed.choices?.[0]?.delta?.content || ''
                  
                  // Send progress update
                  const progressData = JSON.stringify({
                    status: 'processing',
                    message: 'Analyzing image...'
                  })
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`))
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'error',
            message: 'Processing failed'
          })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error in analyze-image:', error)
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { lookup } from 'mime-types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string[] } }
) {
  try {
    // Reconstruct the file path from the array
    const filePath = params.filename.join('/')
    const fullPath = path.join(process.cwd(), 'uploads', filePath)

    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(fullPath)
    
    // Get MIME type
    const mimeType = lookup(fullPath) || 'application/octet-stream'

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })

  } catch (error) {
    console.error('File serving error:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}

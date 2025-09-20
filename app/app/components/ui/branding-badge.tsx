

'use client'

import Image from 'next/image'

interface BrandingBadgeProps {
  className?: string
  showTagline?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function BrandingBadge({ 
  className = '', 
  showTagline = true,
  size = 'md'
}: BrandingBadgeProps) {
  const sizeConfig = {
    sm: {
      container: 'gap-2',
      title: 'text-sm font-bold',
      tagline: 'text-xs',
      badge: 'w-7 h-7',
      textContainer: 'leading-tight'
    },
    md: {
      container: 'gap-3',
      title: 'text-lg font-bold',
      tagline: 'text-sm',
      badge: 'w-10 h-10',
      textContainer: 'leading-tight'
    },
    lg: {
      container: 'gap-4',
      title: 'text-xl font-bold',
      tagline: 'text-base',
      badge: 'w-12 h-12',
      textContainer: 'leading-tight'
    }
  }

  const config = sizeConfig[size]

  return (
    <div className={`inline-flex items-center ${config.container} ${className}`}>
      {/* Original GarageGrid Badge */}
      <div className={`${config.badge} flex-shrink-0 relative`}>
        <Image
          src="/garagegrid-logo.png"
          alt="GarageGrid Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      
      {/* Text Content */}
      <div className={`flex flex-col min-w-0 ${config.textContainer}`}>
        <span className={`${config.title} text-gray-900`}>
          GarageGrid Pro
        </span>
        {showTagline && (
          <div className={`${config.tagline} text-gray-600`}>
            <div>Smart Storage.</div>
            <div>Effortless Retrieval.</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BrandingBadge

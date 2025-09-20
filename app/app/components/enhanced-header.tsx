
'use client';

import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  Mic, 
  Search, 
  Package, 
  LayoutDashboard, 
  Home,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { Input } from '@/components/ui/input';

interface EnhancedHeaderProps {
  onVoiceCommand?: () => void;
  onAddItem?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
}

export default function EnhancedHeader({ 
  onVoiceCommand, 
  onAddItem, 
  searchQuery = '',
  onSearchChange,
  onSearchSubmit
}: EnhancedHeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setMounted(true);
    
    // Detect mobile device - only on client side
    const checkMobile = () => {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
        const isSmallScreen = window.innerWidth <= 768;
        setIsMobile(isMobileDevice || isSmallScreen);
      }
    };

    checkMobile();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearchQuery.trim()) {
      onSearchSubmit?.(localSearchQuery.trim());
      router.push(`/search?q=${encodeURIComponent(localSearchQuery.trim())}`);
    }
  };

  // Simplified button handlers
  const handleAddItem = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onAddItem?.();
  };

  const handleVoiceCommand = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onVoiceCommand?.();
  };

  const handleHomeClick = (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    router.push('/');
  };



  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="container mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
            <img 
              src="/app-icon.png?v=4" 
              alt="GarageGrid Logo" 
              className="w-8 h-8 object-contain flex-shrink-0"
            />
            <div 
              className="cursor-pointer hover:opacity-75 transition-opacity duration-200"
              onClick={handleHomeClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleHomeClick(e as any);
                }
              }}
              aria-label="Go to home"
            >
              <h1 className="text-xl font-bold text-black whitespace-nowrap">GarageGrid Pro</h1>
              <p className="text-xs text-gray-500 -mt-1 whitespace-nowrap">Smart Storage</p>
            </div>
          </div>

          {/* Search Bar - Hidden on small mobile */}
          {mounted && !isMobile && (
            <form onSubmit={handleSearchSubmit} className="relative mx-4 flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={localSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search items, rooms, locations..."
                className="pl-10 h-10 border border-gray-300 rounded-sm"
              />
            </form>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Voice Command Button */}
            {onVoiceCommand && (
              <>
                <Button 
                  onClick={handleVoiceCommand}
                  variant="outline" 
                  size="sm"
                  className="hidden sm:flex border-gray-300"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Voice
                </Button>
                
                {/* Mobile: Icon-only voice button */}
                <Button 
                  onClick={handleVoiceCommand}
                  variant="outline" 
                  size="sm"
                  className="sm:hidden border-gray-300"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </>
            )}
            
            {/* Add Item Button */}
            {onAddItem && (
              <>
                <Button 
                  onClick={handleAddItem}
                  size="sm"
                  className="hidden sm:flex bg-gray-600 hover:bg-gray-700"
                  style={{ touchAction: 'manipulation' }}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Item
                </Button>

                {/* Mobile: Icon-only add button */}
                <Button 
                  onClick={handleAddItem}
                  size="sm"
                  className="sm:hidden bg-gray-600 hover:bg-gray-700"
                  style={{ touchAction: 'manipulation' }}
                >
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Sign Out Button */}
            {session && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3 border border-gray-300"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            )}


          </div>
        </div>

        {/* Mobile Search Bar - Below header on mobile */}
        {mounted && isMobile && (
          <div className="px-4 pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={localSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search items, rooms, locations..."
                className="pl-10 h-10 border border-gray-300 rounded-sm w-full"
              />
            </form>
          </div>
        )}
      </div>
    </header>
  );
}

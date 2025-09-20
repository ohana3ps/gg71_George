
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home, ArrowLeft, Loader2, Package, Search, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
}

interface RoomBreadcrumbNavigationProps {
  items?: BreadcrumbItem[];
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export default function RoomBreadcrumbNavigation({ 
  items, 
  showBackButton = true, 
  onBack,
  className = "" 
}: RoomBreadcrumbNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Auto-generate breadcrumbs from pathname if not provided
  useEffect(() => {
    if (!items) {
      // Store navigation history for back button
      setNavigationHistory(prev => {
        const newHistory = [...prev, pathname];
        // Keep only last 10 items to prevent memory issues
        return newHistory.slice(-10);
      });
    }
  }, [pathname, items]);

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items;

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', icon: Home }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Convert path segments to readable labels
      let label = segment.replace(/-/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
      label = label.charAt(0).toUpperCase() + label.slice(1);
      
      // Add appropriate icons based on segment
      let icon = undefined;
      if (segment === 'rooms') {
        icon = Grid3X3;
        label = 'Rooms';
      } else if (segment === 'items') {
        icon = Package;
        label = 'Items';
      } else if (segment === 'search') {
        icon = Search;
        label = 'Search';
      } else if (segment === 'analytics') {
        icon = Grid3X3;
        label = 'Analytics';
      } else if (segment === 'gallery') {
        icon = Package;
        label = 'Gallery';
      }
      
      // Don't add home again if it's already there
      if (currentPath !== '/') {
        breadcrumbs.push({ 
          label, 
          path: currentPath,
          icon
        });
      }
    });

    return breadcrumbs;
  };

  const handleBreadcrumbClick = async (path: string) => {
    if (path === pathname) return; // Don't navigate to current page
    
    setLoading(true);
    try {
      await router.push(path);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    // Use browser history or navigation history
    if (navigationHistory.length > 1) {
      const previousPath = navigationHistory[navigationHistory.length - 2];
      if (previousPath && previousPath !== pathname) {
        handleBreadcrumbClick(previousPath);
        return;
      }
    }

    // Fallback to router back
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 py-2 px-1 ${className}`}
      aria-label="Breadcrumb navigation"
    >
      {/* Back Button */}
      {showBackButton && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mr-2"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={loading}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowLeft className="w-4 h-4" />
            )}
            <span className="sr-only">Go back</span>
          </Button>
        </motion.div>
      )}

      {/* Breadcrumb Items */}
      <div className="flex items-center flex-wrap gap-1 min-w-0">
        <AnimatePresence>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            const isActive = item.path === pathname;
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-1"
              >
                {/* Breadcrumb Item */}
                <motion.button
                  whileHover={{ scale: isActive ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => !isActive && handleBreadcrumbClick(item.path)}
                  disabled={isActive || loading}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-all duration-200
                    ${isActive 
                      ? 'text-blue-600 font-medium bg-blue-50 cursor-default' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon && (
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-32 sm:max-w-none">
                    {item.label}
                  </span>
                </motion.button>

                {/* Separator */}
                {!isLast && (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Loading Indicator */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="ml-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

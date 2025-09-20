
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ChevronUp,
  ChevronDown,
  Package,
  Search,
  Home,
  Settings,
  User,
  X,
  CheckCircle,
  Move,
  Plus,
  Scan
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface MobileRoomOptimizerProps {
  children: React.ReactNode;
}

export default function MobileRoomOptimizer({ children }: MobileRoomOptimizerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        const userAgent = window.navigator?.userAgent || '';
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isSmallScreen = window.innerWidth < 768;
        const isIpad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        // Treat iPad as mobile for consistency, but only enable mobile actions on smaller screens
        setIsMobile(isMobileDevice || isSmallScreen);
        
        // Debug log for device detection
        console.log('📱 Mobile Optimizer Debug:', {
          userAgent,
          isMobileDevice,
          isSmallScreen,
          isIpad,
          screenWidth: window.innerWidth,
          finalIsMobile: isMobileDevice || isSmallScreen
        });
      }
    };
    
    checkMobile();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Prevent hydration issues by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      
      {/* Mobile Quick Actions Bar */}
      <MobileQuickActionsBar 
        onActionSelect={(action) => {
          setActiveAction(action);
          setShowBottomSheet(true);
        }}
      />
      
      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {showBottomSheet && (
          <MobileBottomSheet
            action={activeAction}
            onClose={() => {
              setShowBottomSheet(false);
              setActiveAction(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile Quick Actions Bar
interface MobileQuickActionsBarProps {
  onActionSelect: (action: string) => void;
}

function MobileQuickActionsBar({ onActionSelect }: MobileQuickActionsBarProps) {
  const actions = [
    { id: 'search', label: 'Search', icon: Search, color: 'bg-blue-500' },
    { id: 'scan', label: 'Scan', icon: Scan, color: 'bg-purple-500' },
    { id: 'add', label: 'Add Item', icon: Plus, color: 'bg-green-500' },
    { id: 'rooms', label: 'Rooms', icon: Home, color: 'bg-orange-500' },
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 md:hidden"
    >
      <Card className="bg-white/95 backdrop-blur-md shadow-2xl">
        <CardContent className="p-2">
          <div className="flex gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  size="sm"
                  onClick={() => onActionSelect(action.id)}
                  className={`${action.color} hover:scale-105 transition-transform text-white h-10 w-10 p-0`}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Mobile Bottom Sheet
interface MobileBottomSheetProps {
  action: string | null;
  onClose: () => void;
}

function MobileBottomSheet({ action, onClose }: MobileBottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 0) {
      setDragY(info.offset.y);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  const getActionContent = () => {
    switch (action) {
      case 'search':
        return <SearchActionContent searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case 'scan':
        return <ScanActionContent />;
      case 'add':
        return <AddItemActionContent />;
      case 'rooms':
        return <RoomsActionContent />;
      default:
        return <div>Select an action</div>;
    }
  };

  const getActionTitle = () => {
    switch (action) {
      case 'search':
        return 'Quick Search';
      case 'scan':
        return 'Scan Item';
      case 'add':
        return 'Add New Item';
      case 'rooms':
        return 'Browse Rooms';
      default:
        return 'Action';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: dragY }}
        exit={{ y: '100%' }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden"
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b">
          <h2 className="text-lg font-semibold">{getActionTitle()}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {getActionContent()}
        </div>
      </motion.div>
    </>
  );
}

// Action Content Components
function SearchActionContent({ searchQuery, setSearchQuery }: { searchQuery: string, setSearchQuery: (query: string) => void }) {
  const router = useRouter();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items, rooms, locations..."
            className="pl-10"
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </form>
    </div>
  );
}

function ScanActionContent() {
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Scan className="w-16 h-16 mx-auto mb-4 text-purple-500" />
        <h3 className="text-lg font-medium mb-2">Scan Item</h3>
        <p className="text-gray-600 text-sm">
          Scan barcodes or QR codes to quickly find or add items
        </p>
        <Button className="mt-4 bg-purple-500 hover:bg-purple-600">
          Open Camera
        </Button>
      </div>
    </div>
  );
}

function AddItemActionContent() {
  const router = useRouter();
  
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Plus className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-lg font-medium mb-2">Add New Item</h3>
        <p className="text-gray-600 text-sm">
          Quickly add a new item to your inventory
        </p>
        <Button 
          className="mt-4 bg-green-500 hover:bg-green-600"
          onClick={() => router.push('/items')}
        >
          Add Item
        </Button>
      </div>
    </div>
  );
}

function RoomsActionContent() {
  const router = useRouter();
  
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Home className="w-16 h-16 mx-auto mb-4 text-orange-500" />
        <h3 className="text-lg font-medium mb-2">Browse Rooms</h3>
        <p className="text-gray-600 text-sm">
          View and manage all your storage rooms
        </p>
        <Button 
          className="mt-4 bg-orange-500 hover:bg-orange-600"
          onClick={() => router.push('/rooms')}
        >
          View Rooms
        </Button>
      </div>
    </div>
  );
}

// Swipe Actions for List Items
interface SwipeActionsProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    label: string;
    icon: React.ComponentType<any>;
    color: string;
  };
  rightAction?: {
    label: string;
    icon: React.ComponentType<any>;
    color: string;
  };
}

export function SwipeActions({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  leftAction, 
  rightAction 
}: SwipeActionsProps) {
  const [dragX, setDragX] = useState(0);
  const [showActions, setShowActions] = useState(false);

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragX(info.offset.x);
    setShowActions(Math.abs(info.offset.x) > 50);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100 && onSwipeRight) {
      onSwipeRight();
    } else if (info.offset.x < -100 && onSwipeLeft) {
      onSwipeLeft();
    }
    setDragX(0);
    setShowActions(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Action */}
      {rightAction && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: dragX > 50 ? 0 : '-100%' }}
          className={`absolute left-0 top-0 bottom-0 w-20 ${rightAction.color} flex items-center justify-center z-10`}
        >
          <div className="text-white text-center">
            <rightAction.icon className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs">{rightAction.label}</span>
          </div>
        </motion.div>
      )}
      
      {/* Right Action */}
      {leftAction && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: dragX < -50 ? 0 : '100%' }}
          className={`absolute right-0 top-0 bottom-0 w-20 ${leftAction.color} flex items-center justify-center z-10`}
        >
          <div className="text-white text-center">
            <leftAction.icon className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs">{leftAction.label}</span>
          </div>
        </motion.div>
      )}
      
      {/* Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: leftAction ? -100 : 0, right: rightAction ? 100 : 0 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        className="relative z-20 bg-white"
      >
        {children}
      </motion.div>
    </div>
  );
}

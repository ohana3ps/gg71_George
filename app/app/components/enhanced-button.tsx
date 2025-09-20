
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface EnhancedButtonProps extends ButtonProps {
  icon?: React.ComponentType<any>;
  loading?: boolean;
  animated?: boolean;
  children?: React.ReactNode;
}

export const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, icon: Icon, loading, animated, children, disabled, ...props }, ref) => {
    const buttonContent = (
      <>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && Icon && <Icon className="mr-2 h-4 w-4" />}
        {children}
      </>
    );

    if (animated) {
      return (
        <motion.div
          whileHover={{ scale: disabled || loading ? 1 : 1.05 }}
          whileTap={{ scale: disabled || loading ? 1 : 0.95 }}
        >
          <Button
            className={cn(className)}
            disabled={disabled || loading}
            ref={ref}
            {...props}
          >
            {buttonContent}
          </Button>
        </motion.div>
      );
    }

    return (
      <Button
        className={cn(className)}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {buttonContent}
      </Button>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

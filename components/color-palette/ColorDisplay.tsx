'use client';

import React from 'react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { convertColor } from '@/lib/color-generation/utils/colorUtils';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorDisplayProps {
  colors: string[];
  className?: string;
  showValues?: boolean;
  format?: 'hex' | 'rgb' | 'hsl';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  copyable?: boolean;
}

/**
 * Component for displaying color palettes
 * Inspired by FarbVelo's color display with modern React patterns
 */
export function ColorDisplay({
  colors,
  className,
  showValues = true,
  format = 'hex',
  size = 'md',
  orientation = 'horizontal',
  copyable = true
}: ColorDisplayProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  
  const copyToClipboard = async (color: string) => {
    if (!copyable) return;
    
    try {
      const value = format === 'hex' ? color : convertColor(color, format);
      await navigator.clipboard.writeText(value);
      setCopiedColor(color);
      setTimeout(() => setCopiedColor(null), 2000);
    } catch (error) {
      console.warn('Failed to copy color:', error);
    }
  };
  
  const getColorValue = (color: string) => {
    switch (format) {
      case 'hex':
        return color.toUpperCase();
      case 'rgb':
        return convertColor(color, 'rgb');
      case 'hsl':
        return convertColor(color, 'hsl');
      default:
        return color;
    }
  };
  
  const sizeClasses = {
    sm: 'h-12',
    md: 'h-20',
    lg: 'h-32'
  };
  
  const containerClasses = cn(
    'flex gap-1 rounded-lg overflow-hidden',
    orientation === 'vertical' ? 'flex-col' : 'flex-row',
    className
  );
  
  return (
    <Card className={containerClasses}>
      {colors.map((color, index) => (
        <div
          key={`${color}-${index}`}
          className={cn(
            'relative group flex-1 transition-all duration-200 cursor-pointer',
            sizeClasses[size],
            copyable && 'hover:scale-105 hover:z-10 hover:shadow-lg'
          )}
          style={{ backgroundColor: color }}
          onClick={() => copyToClipboard(color)}
          role={copyable ? 'button' : undefined}
          tabIndex={copyable ? 0 : undefined}
          onKeyDown={(e) => {
            if (copyable && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              copyToClipboard(color);
            }
          }}
        >
          {/* Color value display */}
          {showValues && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-black/80 text-white px-2 py-1 rounded text-xs font-mono text-center backdrop-blur-sm">
                {getColorValue(color)}
              </div>
            </div>
          )}
          
          {/* Copy indicator */}
          {copyable && (
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {copiedColor === color ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-white/80" />
              )}
            </div>
          )}
          
          {/* Accessibility label */}
          <span className="sr-only">
            Color {index + 1}: {getColorValue(color)}
            {copyable && ', click to copy'}
          </span>
        </div>
      ))}
    </Card>
  );
}
'use client';

import React from 'react';
import { calculateContrastRatio } from '@/lib/color-generation/utils/wcagContrast';
import { findNormalContrastTextColor } from '@/lib/color-generation/utils/colorUtils';
import { cn } from '@/lib/utils';
import type { TextContrastMode } from '@/lib/color-generation/types';

interface LoremIpsumDisplayProps {
  colors: string[];
  className?: string;
  sampleText?: string;
  onGenerateNew?: () => void;
  textContrastMode?: TextContrastMode;
}

const DEFAULT_LOREM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`;

/**
 * Finds the best contrasting text color for a background color
 * Tests against white, black, and all colors in the palette
 */
function findOptimalTextColor(backgroundColor: string, palette: string[]): string {
  const candidates = ['#ffffff', '#000000', ...palette.filter(c => c !== backgroundColor)];
  
  let bestColor = '#000000';
  let bestContrast = 0;
  
  for (const candidate of candidates) {
    const contrast = calculateContrastRatio(backgroundColor, candidate);
    if (contrast > bestContrast) {
      bestContrast = contrast;
      bestColor = candidate;
    }
  }
  
  return bestColor;
}

/**
 * Component that displays lorem ipsum text on each color background
 * with optimal contrasting text color for accessibility
 */
export function LoremIpsumDisplay({
  colors,
  className,
  sampleText = DEFAULT_LOREM,
  onGenerateNew,
  textContrastMode = 'high'
}: LoremIpsumDisplayProps) {
  const paragraphs = sampleText.split('\n\n');
  
  return (
    <div className={cn("space-y-4", className)}>
      {colors.map((backgroundColor, index) => {
        const textColor = textContrastMode === 'normal' 
          ? findNormalContrastTextColor(backgroundColor, colors)
          : findOptimalTextColor(backgroundColor, colors);
        const contrast = calculateContrastRatio(backgroundColor, textColor);
        const contrastGrade = contrast >= 7 ? 'AAA' : contrast >= 4.5 ? 'AA' : 'Fail';
        
        return (
          <div
            key={`${backgroundColor}-${index}`}
            className={cn(
              "p-3 rounded-lg border transition-all hover:shadow-lg",
              onGenerateNew && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            )}
            style={{
              backgroundColor,
              color: textColor
            }}
            onClick={onGenerateNew}
            title={onGenerateNew ? "Click to generate new palette" : undefined}
          >
            {/* Header with color info */}
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-current/20">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold">
                  Color Sample {index + 1}
                </h3>
                <div className="text-xs opacity-75 font-mono">
                  {backgroundColor.toUpperCase()}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-medium">
                  {contrast.toFixed(1)}:1
                </div>
                <div className={cn(
                  "text-xs px-1.5 py-0.5 rounded text-center",
                  contrastGrade === 'AAA' && "bg-green-500/20",
                  contrastGrade === 'AA' && "bg-yellow-500/20", 
                  contrastGrade === 'Fail' && "bg-red-500/20"
                )}>
                  {contrastGrade}
                </div>
              </div>
            </div>
            
            {/* Lorem ipsum content - only first paragraph */}
            <div className="text-xs leading-relaxed">
              <p className="text-justify line-clamp-3">
                {paragraphs[0]}
              </p>
            </div>
            
            {/* Footer with text color info */}
            <div className="mt-2 pt-1 border-t border-current/20 text-xs opacity-75 font-mono">
              Text: {textColor.toUpperCase()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
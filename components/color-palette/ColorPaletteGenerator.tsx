'use client';

import React, { useEffect } from 'react';
import { useColorPalette } from '@/lib/color-generation/hooks/useColorPalette';
import { useColorKeyboardControls } from '@/lib/color-generation/hooks/useColorKeyboardControls';
import { ColorDisplay } from './ColorDisplay';
import { ColorControls } from './ColorControls';
import { LoremIpsumDisplay } from './LoremIpsumDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ColorPaletteSettings, ColorMirrorOptions, TextContrastMode } from '@/lib/color-generation/types';

interface ColorPaletteGeneratorProps {
  initialSettings?: Partial<ColorPaletteSettings>;
  initialMirrorOptions?: Partial<ColorMirrorOptions>;
  showControls?: boolean;
  showKeyboardHints?: boolean;
  showWCAGAnalysis?: boolean;
  showLoremIpsum?: boolean;
  initialTextContrastMode?: TextContrastMode;
  className?: string;
  onPaletteChange?: (palette: string[]) => void;
  onTextContrastModeChange?: (mode: TextContrastMode) => void;
  onSeedChange?: (seed: string) => void;
  colorCount?: number; // External color count that overrides settings
}

/**
 * Complete color palette generator component
 * Combines all FarbVelo functionality into a single React component
 */
export function ColorPaletteGenerator({
  initialSettings,
  initialMirrorOptions,
  showControls = true,
  showKeyboardHints = true,
  showWCAGAnalysis = false,
  showLoremIpsum = true,
  initialTextContrastMode = 'normal',
  className,
  onPaletteChange,
  onTextContrastModeChange,
  onSeedChange,
  colorCount
}: ColorPaletteGeneratorProps) {
  const {
    result,
    settings,
    mirrorOptions,
    includeWCAGAnalysis,
    generateNewPalette,
    updateSettings,
    updateMirrorOptions,
    setIncludeWCAGAnalysis,
    // resetToDefaults
  } = useColorPalette({
    initialSettings,
    initialMirrorOptions,
    initialIncludeWCAGAnalysis: showWCAGAnalysis
  });

  // Text contrast mode state
  const [textContrastMode, setTextContrastMode] = React.useState<TextContrastMode>(initialTextContrastMode);
  
  // Handle text contrast mode changes
  const handleTextContrastModeChange = (mode: TextContrastMode) => {
    setTextContrastMode(mode);
    onTextContrastModeChange?.(mode);
  };

  // Update settings when external colorCount changes
  useEffect(() => {
    if (colorCount !== undefined && colorCount !== settings.amount) {
      updateSettings({ 
        amount: colorCount,
        colorsInGradient: colorCount // Keep generation colors in sync
      });
    }
  }, [colorCount, settings.amount, updateSettings]);

  // Set up keyboard controls
  useColorKeyboardControls({
    onNewColors: () => generateNewPalette(),
    onPaddingIncrease: () => updateSettings({ 
      padding: Math.min(1, settings.padding + 0.05) 
    }),
    onPaddingDecrease: () => updateSettings({ 
      padding: Math.max(0, settings.padding - 0.05) 
    }),
    onToggleMirror: () => updateMirrorOptions({ 
      enabled: !mirrorOptions.enabled 
    }),
    onToggleWCAG: () => setIncludeWCAGAnalysis(!includeWCAGAnalysis),
    enabled: true
  });

  // Enhanced updateSettings that also notifies parent about seed changes
  const handleSettingsChange = (updates: Partial<ColorPaletteSettings>) => {
    updateSettings(updates);
    
    // Notify parent if seed changed
    if (updates.seed && onSeedChange) {
      onSeedChange(updates.seed);
    }
  };

  // Notify parent when palette changes
  useEffect(() => {
    if (onPaletteChange && result.colors) {
      onPaletteChange(result.colors);
    }
  }, [onPaletteChange, result.colors]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Palette Display */}
      <Card className="bg-transparent border-transparent">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Color Palette Generator
            <div className="flex gap-2">
              {mirrorOptions.enabled && (
                <Badge variant="secondary">Mirror</Badge>
              )}
              {includeWCAGAnalysis && (
                <Badge variant="secondary">WCAG</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ColorDisplay 
            colors={result.colors}
            showValues={true}
            format="hex"
            size="lg"
          />
          
          {/* Mirrored colors if enabled */}
          {mirrorOptions.enabled && result.mirroredColors && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Mirrored Colors</h4>
              <ColorDisplay 
                colors={result.mirroredColors}
                showValues={true}
                format="hex"
                size="md"
              />
            </div>
          )}
          
          {/* WCAG Analysis if enabled */}
          {includeWCAGAnalysis && result.wcagContrastColors && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">WCAG Contrast Analysis</h4>
              <div className="text-xs text-muted-foreground">
                Showing contrast-passing color combinations
              </div>
              {result.wcagContrastColors.map((row, i) => 
                row.some(color => color !== false) && (
                  <ColorDisplay
                    key={i}
                    colors={row.filter((color): color is string => color !== false)}
                    showValues={false}
                    size="sm"
                  />
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Control Panel */}
      {showControls && (
        <ColorControls
          settings={settings}
          onSettingsChange={handleSettingsChange}
          mirrorOptions={mirrorOptions}
          onMirrorOptionsChange={updateMirrorOptions}
          includeWCAGAnalysis={includeWCAGAnalysis}
          onWCAGAnalysisChange={setIncludeWCAGAnalysis}
          textContrastMode={textContrastMode}
          onTextContrastModeChange={handleTextContrastModeChange}
          onGenerateNew={() => generateNewPalette()}
        />
      )}

      {/* Lorem Ipsum Text Display */}
      {showLoremIpsum && (
        <Card className="bg-transparent border-transparent">
          <CardHeader>
            <CardTitle>Text Contrast Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Main Palette</h4>
              <LoremIpsumDisplay 
                colors={result.colors} 
                onGenerateNew={generateNewPalette}
                textContrastMode={textContrastMode}
              />
            </div>
            
            {mirrorOptions.enabled && result.mirroredColors && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Mirrored Palette</h4>
                <LoremIpsumDisplay 
                  colors={result.mirroredColors} 
                  onGenerateNew={generateNewPalette}
                  textContrastMode={textContrastMode}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Keyboard Hints */}
      {showKeyboardHints && (
        <Card className="bg-transparent border-transparent">
          <CardHeader>
            <CardTitle className="text-sm">Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><kbd className="px-1 py-0.5 bg-muted rounded">Space</kbd> New palette</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded">←/→</kbd> Adjust padding</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+M</kbd> Toggle mirror</div>
              <div><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+W</kbd> Toggle WCAG</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
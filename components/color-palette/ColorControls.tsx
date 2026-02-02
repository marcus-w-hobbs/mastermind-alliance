'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shuffle, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  ColorPaletteSettings, 
  ColorGeneratorFunction, 
  ColorMode, 
  InterpolationColorModel,
  ColorMirrorOptions,
  TextContrastMode 
} from '@/lib/color-generation/types';

interface ColorControlsProps {
  settings: ColorPaletteSettings;
  onSettingsChange: (updates: Partial<ColorPaletteSettings>) => void;
  mirrorOptions: ColorMirrorOptions;
  onMirrorOptionsChange: (options: Partial<ColorMirrorOptions>) => void;
  includeWCAGAnalysis: boolean;
  onWCAGAnalysisChange: (enabled: boolean) => void;
  textContrastMode: TextContrastMode;
  onTextContrastModeChange: (mode: TextContrastMode) => void;
  onGenerateNew: () => void;
  className?: string;
  // Farbvelo visual effects
  showBackground?: boolean;
  onShowBackgroundChange?: (enabled: boolean) => void;
  showGlow?: boolean;
  onShowGlowChange?: (enabled: boolean) => void;
  colorBleed?: boolean;
  onColorBleedChange?: (enabled: boolean) => void;
  hideText?: boolean;
  onHideTextChange?: (enabled: boolean) => void;
  visuallySeparate?: boolean;
  onVisuallySeparateChange?: (enabled: boolean) => void;
}

/**
 * Control panel for color palette generation settings
 * Based on FarbVelo's control interface adapted for React/Shadcn
 */
export function ColorControls({
  settings,
  onSettingsChange,
  // mirrorOptions,
  // onMirrorOptionsChange,
  includeWCAGAnalysis,
  onWCAGAnalysisChange,
  textContrastMode,
  onTextContrastModeChange,
  onGenerateNew,
  className,
  showBackground = true,
  onShowBackgroundChange,
  showGlow = true,
  onShowGlowChange,
  colorBleed = true,
  onColorBleedChange,
  hideText = false,
  onHideTextChange,
  visuallySeparate = false,
  onVisuallySeparateChange
}: ColorControlsProps) {
  const [seedInput, setSeedInput] = useState(settings.seed || '');
  
  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeedInput(e.target.value);
  };

  const handleSeedSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSettingsChange({ seed: seedInput });
    }
  };

  const handleSeedBlur = () => {
    onSettingsChange({ seed: seedInput });
  };

  const handleGenerateNew = () => {
    // Generate new seed first
    const newSeed = Math.random().toString(16).substr(2, 14);
    setSeedInput(newSeed);
    onSettingsChange({ seed: newSeed });
    
    // Then trigger palette generation
    onGenerateNew();
  };

  // Update local seed input when settings change externally
  React.useEffect(() => {
    setSeedInput(settings.seed || '');
  }, [settings.seed]);
  
  const generatorOptions: { value: ColorGeneratorFunction; label: string }[] = [
    { value: 'Legacy', label: 'Legacy (Vaporwave)' },
    { value: 'Hue Bingo', label: 'Hue Bingo' },
    { value: 'RandomColor.js', label: 'RandomColor.js' },
    { value: 'Simplex Noise', label: 'Simplex Noise' },
    { value: 'Full Random', label: 'Full Random' }
  ];
  
  const colorModeOptions: { value: ColorMode; label: string }[] = [
    { value: 'hsluv', label: 'HSLuv' },
    { value: 'hpluv', label: 'HPLuv' },
    { value: 'oklch', label: 'OKLCH' },
    { value: 'hcl', label: 'HCL' },
    { value: 'hsl', label: 'HSL' },
    { value: 'hcg', label: 'HCG' },
    { value: 'hsv', label: 'HSV' }
  ];
  
  const interpolationOptions: { value: InterpolationColorModel; label: string }[] = [
    { value: 'lab', label: 'LAB' },
    { value: 'oklab', label: 'OKLab' },
    { value: 'spectral', label: 'Spectral' },
    { value: 'rgb', label: 'RGB' },
    { value: 'lrgb', label: 'Linear RGB' },
    { value: 'hcl', label: 'HCL' },
    { value: 'hsl', label: 'HSL' },
    { value: 'hsv', label: 'HSV' },
    { value: 'hsi', label: 'HSI' },
    { value: 'oklch', label: 'OKLCH' }
  ];
  
  return (
    <Card className={cn("bg-transparent border-transparent", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Color Palette Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Buttons and Seed Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={handleGenerateNew} className="shrink-0">
              <Shuffle className="w-4 h-4 mr-2" />
              Generate New
            </Button>
            <Input
              type="text"
              value={seedInput}
              onChange={handleSeedChange}
              onKeyDown={handleSeedSubmit}
              onBlur={handleSeedBlur}
              placeholder="Seed (press Enter to apply)"
              className="flex-1 font-mono text-sm"
            />
          </div>
        </div>
        
        {/* Dropdowns - Vertical Stack to match farbvelo */}
        <div className="space-y-4">
          {/* Generation Method */}
          <div className="space-y-2">
            <Label>Generation Method</Label>
            <Select 
              value={settings.generatorFunction} 
              onValueChange={(value: ColorGeneratorFunction) => 
                onSettingsChange({ generatorFunction: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generatorOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Mode */}
          <div className="space-y-2">
            <Label>Color Mode</Label>
            <Select 
              value={settings.colorMode} 
              onValueChange={(value: ColorMode) => 
                onSettingsChange({ colorMode: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorModeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interpolation Model */}
          <div className="space-y-2">
            <Label>Interpolation Model</Label>
            <Select 
              value={settings.interpolationColorModel} 
              onValueChange={(value: InterpolationColorModel) => 
                onSettingsChange({ interpolationColorModel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {interpolationOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Text Contrast Mode */}
          <div className="space-y-2">
            <Label>Text Contrast Mode</Label>
            <Select 
              value={textContrastMode} 
              onValueChange={(value: TextContrastMode) => onTextContrastModeChange(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal Contrast</SelectItem>
                <SelectItem value="high">High Contrast</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Color Count */}
        <div className="space-y-2">
          <Label>Colors: {settings.amount}</Label>
          <Slider
            value={[settings.amount]}
            onValueChange={([value]) => onSettingsChange({ amount: value })}
            min={3}
            max={12}
            step={1}
            className="w-full"
          />
        </div>
        
        {/* Mix Padding */}
        <div className="space-y-2">
          <Label>Mix Padding: {(settings.padding * 100).toFixed(1)}%</Label>
          <Slider
            value={[settings.padding]}
            onValueChange={([value]) => onSettingsChange({ padding: value })}
            min={0}
            max={1}
            step={0.01}
            className="w-full"
          />
        </div>

        {/* Color Stops */}
        <div className="space-y-2">
          <Label>Color Stops: {settings.colorsInGradient}</Label>
          <Slider
            value={[settings.colorsInGradient]}
            onValueChange={([value]) => onSettingsChange({ colorsInGradient: value })}
            min={2}
            max={settings.amount}
            step={1}
            className="w-full"
          />
        </div>
        
        {/* Min Hue Distance */}
        <div className="space-y-2">
          <Label>Min. Hue angle difference: {settings.minHueDistance}°</Label>
          <Slider
            value={[settings.minHueDistance]}
            onValueChange={([value]) => onSettingsChange({ minHueDistance: value })}
            min={15}
            max={180}
            step={15}
            className="w-full"
          />
        </div>

        {/* Checkboxes - matching farbvelo layout */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-contrasting-colors"
              checked={includeWCAGAnalysis}
              onChange={(e) => onWCAGAnalysisChange(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="show-contrasting-colors" className="text-sm">Show Contrasting Colors</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-background"
              checked={showBackground}
              onChange={(e) => onShowBackgroundChange?.(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="show-background" className="text-sm">Show Background</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-glow"
              checked={showGlow}
              onChange={(e) => onShowGlowChange?.(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="show-glow" className="text-sm">Show Glow</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="color-bleed"
              checked={colorBleed}
              onChange={(e) => onColorBleedChange?.(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="color-bleed" className="text-sm">Color Bleed</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hide-text"
              checked={hideText}
              onChange={(e) => onHideTextChange?.(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="hide-text" className="text-sm">Hide Text</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="visually-separate-things"
              checked={visuallySeparate}
              onChange={(e) => onVisuallySeparateChange?.(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="visually-separate-things" className="text-sm">Visually Separate Things</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="high-contrast"
              checked={textContrastMode === 'high'}
              onChange={(e) => onTextContrastModeChange(e.target.checked ? 'high' : 'normal')}
              className="rounded"
            />
            <Label htmlFor="high-contrast" className="text-sm">High Contrast</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="expand-ui"
              checked={false} // This would need to be connected to actual state
              onChange={() => {/* Handle expand UI toggle */}}
              className="rounded"
            />
            <Label htmlFor="expand-ui" className="text-sm">Expand UI</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="same-height-colors"
              checked={true} // This would need to be connected to actual state
              onChange={() => {/* Handle same height colors toggle */}}
              className="rounded"
            />
            <Label htmlFor="same-height-colors" className="text-sm">Same Height Colors</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="lightmode"
              checked={false} // This would need to be connected to actual state
              onChange={() => {/* Handle lightmode toggle */}}
              className="rounded"
            />
            <Label htmlFor="lightmode" className="text-sm">Lightmode</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
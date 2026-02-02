/* eslint-disable */
// @ts-nocheck
'use client';

import { useState, useCallback, useMemo } from 'react';
import seedrandom from 'seedrandom';
import { generateColors } from '../utils/colorGenerators';
import { interpolateColors, mirrorColors, shuffleArray } from '../utils/colorUtils';
import { analyzeWCAGContrast } from '../utils/wcagContrast';
import type { 
  ColorPaletteSettings, 
  ColorPaletteResult, 
  ColorGenerationParams,
  ColorMirrorOptions 
} from '../types';

interface UseColorPaletteOptions {
  initialSettings?: Partial<ColorPaletteSettings>;
  initialMirrorOptions?: Partial<ColorMirrorOptions>;
  initialIncludeWCAGAnalysis?: boolean;
}

/**
 * Main React hook for color palette generation and management
 * Converted from FarbVelo Vue.js reactive system to React hooks
 */
export function useColorPalette(options?: UseColorPaletteOptions | Partial<ColorPaletteSettings>) {
  // Handle backwards compatibility - if called with just settings
  const { initialSettings, initialMirrorOptions, initialIncludeWCAGAnalysis } = typeof (options as any)?.amount !== 'undefined' 
    ? { initialSettings: options as Partial<ColorPaletteSettings>, initialMirrorOptions: undefined, initialIncludeWCAGAnalysis: undefined }
    : (options as UseColorPaletteOptions) || {};
  // Default settings based on FarbVelo defaults
  const [settings, setSettings] = useState<ColorPaletteSettings>({
    amount: 6,
    colorsInGradient: 4,
    colorMode: 'hsluv',
    minHueDistance: 60,
    interpolationColorModel: 'lab',
    generatorFunction: 'Legacy',
    randomOrder: false,
    padding: 0.175,
    seed: Math.random().toString(36).substring(7),
    ...initialSettings
  });

  const [mirrorOptions, setMirrorOptions] = useState<ColorMirrorOptions>({
    enabled: false,
    type: 'simple',
    ...initialMirrorOptions
  });

  const [includeWCAGAnalysis, setIncludeWCAGAnalysis] = useState(initialIncludeWCAGAnalysis ?? false);
  const [includeBlackWhiteContrast, setIncludeBlackWhiteContrast] = useState(false);

  // Generate seeded random function
  const randomFunction = useMemo(() => {
    return seedrandom(settings.seed || '');
  }, [settings.seed]);

  // Generate base colors using the selected algorithm
  const baseColors = useMemo(() => {
    const params: ColorGenerationParams = {
      amount: settings.amount,
      parts: settings.colorsInGradient,
      minHueDiffAngle: settings.minHueDistance,
      colorMode: settings.colorMode,
      currentSeed: settings.seed || '',
      random: randomFunction
    };

    return generateColors(settings.generatorFunction, params);
  }, [
    settings.generatorFunction,
    settings.amount,
    settings.colorsInGradient,
    settings.minHueDistance,
    settings.colorMode,
    settings.seed,
    randomFunction
  ]);

  // Interpolate to target amount and apply effects
  const processedColors = useMemo(() => {
    let colors = baseColors;

    // Interpolate if we need more colors
    if (colors.length < settings.amount) {
      colors = interpolateColors(
        colors,
        settings.amount,
        settings.padding,
        settings.interpolationColorModel
      );
    }

    // Trim to exact amount
    colors = colors.slice(0, settings.amount);

    // Apply random order if enabled
    if (settings.randomOrder) {
      colors = shuffleArray(colors, randomFunction);
    }

    return colors;
  }, [
    baseColors,
    settings.amount,
    settings.padding,
    settings.interpolationColorModel,
    settings.randomOrder,
    randomFunction
  ]);

  // Generate final result with optional features
  const result: ColorPaletteResult = useMemo(() => {
    const colors = processedColors;
    const mirroredColors = mirrorOptions.enabled ? mirrorColors(colors) : undefined;
    const wcagContrastColors = includeWCAGAnalysis 
      ? analyzeWCAGContrast(colors, includeBlackWhiteContrast)
      : undefined;

    return {
      colors,
      mirroredColors,
      wcagContrastColors
    };
  }, [processedColors, mirrorOptions.enabled, includeWCAGAnalysis, includeBlackWhiteContrast]);

  // Actions
  const generateNewPalette = useCallback((newSeed?: string) => {
    setSettings(prev => ({
      ...prev,
      seed: newSeed || Math.random().toString(36).substring(7)
    }));
  }, []);

  const updateSettings = useCallback((updates: Partial<ColorPaletteSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      // Ensure colorsInGradient doesn't exceed amount
      if (newSettings.colorsInGradient > newSettings.amount) {
        newSettings.colorsInGradient = newSettings.amount;
      }
      return newSettings;
    });
  }, []);

  const updateMirrorOptions = useCallback((options: Partial<ColorMirrorOptions>) => {
    setMirrorOptions(prev => ({ ...prev, ...options }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings({
      amount: 6,
      colorsInGradient: 4,
      colorMode: 'hsluv',
      minHueDistance: 60,
      interpolationColorModel: 'lab',
      generatorFunction: 'Legacy',
      randomOrder: false,
      padding: 0.175,
      seed: Math.random().toString(36).substring(7)
    });
    setMirrorOptions({ enabled: false, type: 'simple' });
    setIncludeWCAGAnalysis(false);
    setIncludeBlackWhiteContrast(false);
  }, []);

  return {
    // Current state
    result,
    settings,
    mirrorOptions,
    includeWCAGAnalysis,
    includeBlackWhiteContrast,
    
    // Actions
    generateNewPalette,
    updateSettings,
    updateMirrorOptions,
    setIncludeWCAGAnalysis,
    setIncludeBlackWhiteContrast,
    resetToDefaults,
    
    // Computed values for convenience
    colors: result.colors,
    mirroredColors: result.mirroredColors,
    wcagContrastColors: result.wcagContrastColors
  };
}
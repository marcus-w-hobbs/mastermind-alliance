/* eslint-disable */
// @ts-nocheck
import chroma from 'chroma-js';
import { hsluvToHex, hpluvToHex } from 'hsluv';
import type { ColorMode } from '../types';

/**
 * Converts coordinates to hex color based on the specified color mode
 * Extracted from FarbVelo utils.js
 */
export function coordsToHex(angle: number, val1: number, val2: number, mode: ColorMode = 'hsluv'): string {
  try {
    if (mode === 'hsluv') {
      return hsluvToHex([angle, val1, val2]);
    } else if (mode === 'hpluv') {
      return hpluvToHex([angle, val1, val2]);
    } else if (mode === 'oklch') {
      return chroma(val2 / 100 * 0.999, val1 / 100 * 0.322, angle, 'oklch').hex();
    } else if (mode === 'hcl') {
      return chroma.hcl(angle, val1, val2).hex();
    } else if (mode === 'hsl') {
      return chroma.hsl(angle, val1 / 100, val2 / 100).hex();
    } else if (mode === 'hcg') {
      return chroma.hcg(angle, val1 / 100, val2 / 100).hex();
    } else if (mode === 'hsv') {
      return chroma.hsv(angle, val1 / 100, val2 / 100).hex();
    }
    
    // Fallback to HSLuv
    return hsluvToHex([angle, val1, val2]);
  } catch (error) {
    console.warn(`Error converting color coordinates (${angle}, ${val1}, ${val2}) in mode ${mode}:`, error);
    // Return a safe fallback color
    return '#000000';
  }
}

/**
 * Shuffles an array using Fisher-Yates algorithm with seeded random
 */
export function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Creates mirrored colors from original palette
 * Extracted from FarbVelo main.js mirroredColors computed property
 */
export function mirrorColors(colors: string[]): string[] {
  if (!colors || colors.length <= 1) return colors;
  
  // Create first mirror (e.g., 1234321)
  const reversedColors = [...colors].slice(0, -1).reverse();
  const firstMirror = [...colors, ...reversedColors];
  
  // Create second mirror to avoid duplication at turning point
  const secondMirror = firstMirror.slice(0, -1);
  return [...firstMirror, ...secondMirror.slice(1)];
}

/**
 * Interpolates colors using chroma.js with padding
 * Extracted from FarbVelo main.js colors computed property
 */
export function interpolateColors(
  baseColors: string[], 
  targetAmount: number, 
  padding: number = 0.175,
  interpolationMode: string = 'lab'
): string[] {
  try {
    if (baseColors.length === 0) return [];
    if (baseColors.length >= targetAmount) return baseColors.slice(0, targetAmount);
    
    const scale = chroma.scale(baseColors)
      .padding(padding)
      .mode(interpolationMode === 'spectral' ? 'lch' : interpolationMode);
    
    return scale.colors(targetAmount);
  } catch (error) {
    console.warn('Error interpolating colors:', error);
    return baseColors;
  }
}

/**
 * Applies spectral interpolation between colors
 * Requires spectral.js library
 */
export function applySpectralInterpolation(
  colors: string[], 
  targetAmount: number,
  spectralMix: (color1: string, color2: string, ratio: number) => string
): string[] {
  if (colors.length >= targetAmount) return colors;
  
  const result = [...colors];
  const gaps = targetAmount - colors.length;
  const segmentSize = Math.floor(gaps / (colors.length - 1));
  
  for (let i = 0; i < colors.length - 1; i++) {
    const color1 = colors[i];
    const color2 = colors[i + 1];
    
    for (let j = 1; j <= segmentSize; j++) {
      const ratio = j / (segmentSize + 1);
      const mixedColor = spectralMix(color1, color2, ratio);
      result.splice(i + j + (i * segmentSize), 0, mixedColor);
    }
  }
  
  return result.slice(0, targetAmount);
}

/**
 * Converts hex color to various formats
 */
export function convertColor(hex: string, format: 'rgb' | 'hsl' | 'cmyk' | 'lab' | 'oklch' = 'rgb'): string {
  try {
    const color = chroma(hex);
    
    switch (format) {
      case 'rgb':
        return color.css('rgb');
      case 'hsl':
        return color.css('hsl');
      case 'cmyk':
        return color.css('cmyk');
      case 'lab':
        const lab = color.lab();
        return `lab(${lab[0].toFixed(1)} ${lab[1].toFixed(1)} ${lab[2].toFixed(1)})`;
      case 'oklch':
        const oklch = color.oklch();
        return `oklch(${oklch[0].toFixed(3)} ${oklch[1].toFixed(3)} ${oklch[2].toFixed(1)})`;
      default:
        return hex;
    }
  } catch (error) {
    console.warn(`Error converting color ${hex} to ${format}:`, error);
    return hex;
  }
}

/**
 * Validates if a string is a valid hex color
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

/**
 * Generates a random hex color
 */
export function randomHex(random: () => number): string {
  const r = Math.floor(random() * 256);
  const g = Math.floor(random() * 256);
  const b = Math.floor(random() * 256);
  return chroma.rgb(r, g, b).hex();
}

/**
 * Extracts lightness value from a hex color using perceived luminance
 * Returns value between 0 (darkest) and 1 (lightest)
 */
export function extractLightness(hex: string): number {
  try {
    const color = chroma(hex);
    // Use luminance for perceptual accuracy (WCAG standard)
    return color.luminance();
  } catch (error) {
    console.warn(`[colorUtils]: Error extracting lightness from ${hex}:`, error);
    return 0; // Default to darkest if error
  }
}

/**
 * Sorts palette colors by lightness from darkest to lightest
 * Maintains semantic ordering: palette[0] = darkest, palette[N-1] = lightest
 */
export function sortPaletteByLightness(colors: string[]): string[] {
  if (!colors || colors.length <= 1) return colors;
  
  try {
    return [...colors].sort((a, b) => {
      const lightnessA = extractLightness(a);
      const lightnessB = extractLightness(b);
      return lightnessA - lightnessB; // Ascending order: dark to light
    });
  } catch (error) {
    console.warn('[colorUtils]: Error sorting palette by lightness:', error);
    return colors; // Return original if sorting fails
  }
}

/**
 * Finds a normal contrast text color for a background color
 * Returns a color from the palette that provides readable contrast but maintains color harmony
 * Based on FarbVelo's normal contrast mode (not high contrast)
 */
export function findNormalContrastTextColor(backgroundColor: string, palette: string[]): string {
  try {
    const backgroundLightness = extractLightness(backgroundColor);
    const backgroundChroma = chroma(backgroundColor);
    
    // Filter out the exact background color
    const availableColors = palette.filter(color => color !== backgroundColor);
    
    if (availableColors.length === 0) {
      // Fallback to high contrast if no other colors available
      return backgroundLightness > 0.5 ? '#000000' : '#ffffff';
    }
    
    // Strategy: Find colors with sufficient lightness difference but similar hue
    let bestColor = availableColors[0];
    let bestScore = 0;
    
    for (const candidate of availableColors) {
      const candidateLightness = extractLightness(candidate);
      const candidateChroma = chroma(candidate);
      
      // Calculate lightness difference (higher is better for readability)
      const lightnessDiff = Math.abs(backgroundLightness - candidateLightness);
      
      // Calculate hue similarity (lower difference is better for harmony)
      const bgHue = backgroundChroma.get('hsl.h') || 0;
      const candidateHue = candidateChroma.get('hsl.h') || 0;
      let hueDiff = Math.abs(bgHue - candidateHue);
      if (hueDiff > 180) hueDiff = 360 - hueDiff; // Handle hue wrap-around
      
      // Prefer colors that are different enough in lightness but similar in hue
      // Weight lightness difference more heavily than hue similarity
      const score = lightnessDiff * 2 - (hueDiff / 180);
      
      if (score > bestScore) {
        bestScore = score;
        bestColor = candidate;
      }
    }
    
    // Ensure minimum contrast for readability (at least 3:1 ratio)
    const contrast = chroma.contrast(backgroundColor, bestColor);
    if (contrast < 3) {
      // If contrast is too low, fall back to high contrast
      return backgroundLightness > 0.5 ? '#000000' : '#ffffff';
    }
    
    return bestColor;
  } catch (error) {
    console.warn('[colorUtils]: Error finding normal contrast text color:', error);
    // Fallback to simple high contrast
    const lightness = extractLightness(backgroundColor);
    return lightness > 0.5 ? '#000000' : '#ffffff';
  }
}

/**
 * Generates CSS gradient stops from color array
 * Based on FarbVelo gradient generation
 */
export function createGradientStops(colors: string[], hard: boolean = false): string {
  if (!colors || colors.length === 0) return '';
  
  if (colors.length === 1) {
    return `${colors[0]} 0%, ${colors[0]} 100%`;
  }
  
  const step = 100 / (colors.length - 1);
  
  return colors.map((color, index) => {
    const position = Math.round(index * step);
    if (hard && index > 0 && index < colors.length - 1) {
      // Create hard stops for sharp transitions
      const prevPosition = Math.round((index - 0.5) * step);
      const nextPosition = Math.round((index + 0.5) * step);
      return `${color} ${prevPosition}%, ${color} ${nextPosition}%`;
    }
    return `${color} ${position}%`;
  }).join(', ');
}

/**
 * Creates CSS custom properties object for farbvelo-style theming
 */
export function createColorThemeVars(palette: string[]): Record<string, string> {
  if (!palette || palette.length === 0) return {};
  
  // Sort palette by brightness (dark to light) for single-pass gradient
  const brightnessSorted = sortPaletteByLightness(palette);
  const gradientStops = createGradientStops(brightnessSorted);
  const hardStops = createGradientStops(brightnessSorted, true);
  
  // Keep mirrored version for compatibility if needed elsewhere
  const mirroredColors = mirrorColors(palette);
  
  return {
    '--palette-first': palette[0],
    '--palette-last': palette[palette.length - 1],
    '--palette-length': palette.length.toString(),
    '--mirrored-length': mirroredColors.length.toString(),
    '--gradient-soft': gradientStops,
    '--gradient-hard': hardStops,
    '--original-gradient': createGradientStops(palette),
    '--original-gradient-hard': createGradientStops(palette, true),
    '--brightness-sorted': createGradientStops(brightnessSorted),
    '--brightness-sorted-hard': createGradientStops(brightnessSorted, true),
  };
}
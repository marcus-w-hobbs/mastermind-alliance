/* eslint-disable */
// @ts-nocheck
import chroma from 'chroma-js';
import type { WCAGContrastResult } from '../types';

/**
 * WCAG contrast analysis utilities
 * Extracted from FarbVelo main.js wcagContrastColors computed property
 */

/**
 * Calculates WCAG contrast ratio between two colors
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  try {
    return chroma.contrast(color1, color2);
  } catch (error) {
    console.warn(`Error calculating contrast between ${color1} and ${color2}:`, error);
    return 1; // Return minimum contrast as fallback
  }
}

/**
 * Checks if contrast ratio meets WCAG AA standard (4.5:1)
 */
export function meetsWCAGAA(color1: string, color2: string): boolean {
  return calculateContrastRatio(color1, color2) >= 4.5;
}

/**
 * Checks if contrast ratio meets WCAG AAA standard (7:1)
 */
export function meetsWCAGAAA(color1: string, color2: string): boolean {
  return calculateContrastRatio(color1, color2) >= 7;
}

/**
 * Analyzes WCAG contrast for all color combinations in a palette
 * Returns matrix where each cell indicates if the contrast passes WCAG AA
 */
export function analyzeWCAGContrast(
  colors: string[], 
  includeBlackWhite: boolean = false
): (string | false)[][] {
  const testColors = includeBlackWhite 
    ? [...colors, "#ffffff", "#000000"] 
    : colors;
    
  return colors.map((color) =>
    testColors.map((color2) =>
      meetsWCAGAA(color, color2) ? color2 : false
    )
  );
}

/**
 * Gets all color pairs that meet WCAG AA contrast requirements
 */
export function getAccessibleColorPairs(
  colors: string[], 
  includeBlackWhite: boolean = false
): WCAGContrastResult[] {
  const results: WCAGContrastResult[] = [];
  const testColors = includeBlackWhite 
    ? [...colors, "#ffffff", "#000000"] 
    : colors;
  
  for (let i = 0; i < colors.length; i++) {
    for (let j = 0; j < testColors.length; j++) {
      if (i === j && !includeBlackWhite) continue; // Skip same color unless testing with B&W
      
      const color1 = colors[i];
      const color2 = testColors[j];
      const contrast = calculateContrastRatio(color1, color2);
      const passes = contrast >= 4.5;
      
      results.push({
        color1,
        color2,
        contrast,
        passes
      });
    }
  }
  
  return results;
}

/**
 * Finds the best contrasting color for a given color from a palette
 */
export function findBestContrastingColor(
  targetColor: string, 
  palette: string[]
): { color: string; contrast: number } | null {
  let bestColor = null;
  let bestContrast = 0;
  
  for (const color of palette) {
    if (color === targetColor) continue;
    
    const contrast = calculateContrastRatio(targetColor, color);
    if (contrast > bestContrast) {
      bestContrast = contrast;
      bestColor = color;
    }
  }
  
  return bestColor ? { color: bestColor, contrast: bestContrast } : null;
}

/**
 * Generates accessible color pairs from a palette
 * Returns array of [background, foreground] pairs that meet WCAG AA
 */
export function generateAccessiblePairs(colors: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const color1 = colors[i];
      const color2 = colors[j];
      
      if (meetsWCAGAA(color1, color2)) {
        pairs.push([color1, color2]);
        pairs.push([color2, color1]); // Both directions
      }
    }
  }
  
  return pairs;
}

/**
 * Gets contrast grade (AA, AAA, or Fail) for a color pair
 */
export function getContrastGrade(color1: string, color2: string): 'AAA' | 'AA' | 'Fail' {
  const contrast = calculateContrastRatio(color1, color2);
  
  if (contrast >= 7) return 'AAA';
  if (contrast >= 4.5) return 'AA';
  return 'Fail';
}
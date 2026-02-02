/* eslint-disable */
// @ts-nocheck
// Main export file for the color generation system
// This makes it easy to import everything from one place

// Types
export type * from './types';

// Core utilities
export * from './utils/colorUtils';
export * from './utils/colorGenerators';
export * from './utils/wcagContrast';

// React hooks
export * from './hooks/useColorPalette';
export * from './hooks/useColorKeyboardControls';
export * from './hooks/useColorGestures';

// Default settings constant
export const DEFAULT_COLOR_SETTINGS = {
  amount: 6,
  colorsInGradient: 4,
  colorMode: 'hsluv' as const,
  minHueDistance: 60,
  interpolationColorModel: 'lab' as const,
  generatorFunction: 'Legacy' as const,
  randomOrder: false,
  padding: 0.175
};
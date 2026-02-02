/* eslint-disable */
// @ts-nocheck
export type ColorGeneratorFunction = 
  | "Legacy" 
  | "Hue Bingo" 
  | "RandomColor.js" 
  | "Simplex Noise" 
  | "Full Random";

export type ColorMode = 
  | "hsluv" 
  | "hpluv" 
  | "oklch" 
  | "hcl" 
  | "hsl" 
  | "hcg" 
  | "hsv";  

export type InterpolationColorModel = 
  | "lab" 
  | "oklab" 
  | "spectral" 
  | "rgb" 
  | "lrgb" 
  | "hcl" 
  | "hsl" 
  | "hsv" 
  | "hsi" 
  | "oklch";

export interface ColorPaletteSettings {
  amount: number;
  colorsInGradient: number;
  colorMode: ColorMode;
  minHueDistance: number;
  interpolationColorModel: InterpolationColorModel;
  generatorFunction: ColorGeneratorFunction;
  randomOrder: boolean;
  padding: number;
  seed?: string;
}

export interface ColorGenerationParams {
  amount: number;
  parts: number;
  minHueDiffAngle: number;
  colorMode: ColorMode;
  currentSeed: string;
  random: () => number;
}

export interface ColorPaletteResult {
  colors: string[];
  mirroredColors?: string[];
  wcagContrastColors?: (string | false)[][];
}

export interface WCAGContrastResult {
  color1: string;
  color2: string;
  contrast: number;
  passes: boolean;
}

export interface ColorMirrorOptions {
  enabled: boolean;
  type: 'simple' | 'double';
}

export interface ColorExportOptions {
  format: 'hex' | 'rgb' | 'hsl' | 'css' | 'json' | 'csv';
  includeNames?: boolean;
}

export type TextContrastMode = 'normal' | 'high';

export interface TextContrastOptions {
  mode: TextContrastMode;
}
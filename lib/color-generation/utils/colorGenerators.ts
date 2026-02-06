/* eslint-disable */
// @ts-nocheck
import randomColor from 'randomcolor';
import { createNoise2D } from 'simplex-noise';
import seedrandom from 'seedrandom';
import { coordsToHex, shuffleArray, sortPaletteByLightness } from './colorUtils';
import type { ColorGenerationParams, ColorGeneratorFunction } from '../types';

/**
 * Main color generation function that routes to specific algorithms
 * Extracted from FarbVelo lib/generate-random-colors.js
 */
export function generateColors(
  generatorFunction: ColorGeneratorFunction,
  params: ColorGenerationParams
): string[] {
  const { amount, parts, minHueDiffAngle, colorMode, currentSeed, random } = params;
  
  let colors: string[] = [];
  
  switch (generatorFunction) {
    case "Hue Bingo":
      colors = generateHueBingo(params);
      break;
    case "Legacy":
      colors = generateLegacy(params);
      break;
    case "Simplex Noise":
      colors = generateSimplexNoise(params);
      break;
    case "RandomColor.js":
      colors = generateRandomColorJS(params);
      break;
    case "Full Random":
      colors = generateFullRandom(params);
      break;
    default:
      colors = generateLegacy(params);
  }
  
  return colors;
}

/**
 * Hue Bingo algorithm - exact copy from FarbVelo lib/generate-random-colors.js lines 21-39
 */
function generateHueBingo({ amount, parts, minHueDiffAngle, colorMode, random }: ColorGenerationParams): string[] {
  const colors: string[] = [];
  const baseHue = random() * 360;
  const hues = new Array(Math.round(360 / minHueDiffAngle)).fill('').map((_, i) => (baseHue + i * minHueDiffAngle) % 360);
  const baseSaturation = random() * 35 + 5; // 5-40
  const baseLightness = random() * 20; // 0-20
  const rangeLightness = 90 - baseLightness;
  
  // First color: base with modified lightness
  colors.push(coordsToHex(hues[0], baseSaturation, baseLightness * random() * 0.5 + baseLightness * 0.25, colorMode));
  
  const minSat = random() * 20 + 50; // 50-70
  const maxSat = minSat + 30;
  const minLight = random() * 35 + 35; // 35-70
  const maxLight = Math.min(minLight + random() * 20 + 20, 95); // minLight + 20-40, max 95
  const remainingHues = [...hues];
  
  // Middle colors with progressive lightness
  for (let i = 0; i < parts - 2; i++) {
    const hue = remainingHues.splice(Math.floor(random() * remainingHues.length), 1)[0];
    const saturation = random() * (maxSat - minSat) + minSat;
    const light = baseLightness + random() * 10 + ((rangeLightness / (parts - 1)) * i);
    colors.push(coordsToHex(hue, saturation, random() * (maxLight - light) + light, colorMode));
  }
  
  // Final color: first remaining hue with high lightness
  colors.push(coordsToHex(remainingHues[0], baseSaturation, rangeLightness + 10, colorMode));
  
  return colors;
}

/**
 * Legacy algorithm - exact copy from FarbVelo lib/generate-random-colors.js lines 40-59
 */
function generateLegacy({ amount, parts, minHueDiffAngle, colorMode, random }: ColorGenerationParams): string[] {
  const colors: string[] = [];
  const part = Math.floor(amount / parts);
  const reminder = amount % parts;
  const baseHue = random() * 360;
  const hues = new Array(Math.round(360 / minHueDiffAngle)).fill('').map((_, i) => (baseHue + i * minHueDiffAngle) % 360);
  const baseSaturation = random() * 35 + 5; // 5-40
  const baseLightness = random() * 20; // 0-20
  const rangeLightness = 90 - baseLightness;
  
  // First color: base color with modified lightness
  colors.push(coordsToHex(hues[0], baseSaturation, baseLightness * random() * 0.5 + baseLightness * 0.25, colorMode));
  
  // Monochromatic progression using base hue
  for (let i = 0; i < (part - 1); i++) {
    colors.push(coordsToHex(hues[0], baseSaturation, baseLightness + (rangeLightness * Math.pow(i / (part - 1), 1.5)), colorMode));
  }
  
  const minSat = random() * 20 + 50; // 50-70
  const maxSat = minSat + 30;
  const minLight = random() * 35 + 45; // 45-80
  const maxLight = Math.min(minLight + 40, 95);
  
  // Random hue colors
  for (let i = 0; i < (part + reminder - 1); i++) {
    colors.push(coordsToHex(hues[Math.floor(random() * hues.length)], random() * (maxSat - minSat) + minSat, random() * (maxLight - minLight) + minLight, colorMode));
  }
  
  // Final color: base hue with maximum lightness
  colors.push(coordsToHex(hues[0], baseSaturation, rangeLightness, colorMode));
  
  return colors;
}

/**
 * Simplex Noise generator - exact copy from FarbVelo lib/generate-random-colors.js lines 64-73
 */
function generateSimplexNoise({
  parts,
  minHueDiffAngle,
  colorMode,
  currentSeed,
  random
}: ColorGenerationParams): string[] {
  const colors: string[] = [];
  const seededRandom = seedrandom(currentSeed);
  const noise2D = createNoise2D(seededRandom);
  const minLight = random() * 30 + 50; // 50-80
  const maxLight = Math.min(minLight + 40, 95);
  const minSat = random() * 60 + 20; // 20-80
  const maxSat = random() * 20 + 80; // 80-100
  const satRamp = maxSat - minSat;
  
  for (let i = 0; i < parts + 1; i++) {
    const hue = noise2D(0.5, (i / parts) * (3 * (minHueDiffAngle / 360))) * 360;
    const saturation = minSat + (i / parts) * satRamp;
    const lightness = i ? 55 + (i / parts) * (maxLight - minLight) : random() * 30 + 10;
    
    colors.push(coordsToHex(hue, saturation, lightness, colorMode));
  }
  
  return colors;
}

/**
 * RandomColor.js integration - uses the popular randomcolor library
 * From FarbVelo lib/generate-random-colors.js lines 74-79
 */
function generateRandomColorJS({ parts, currentSeed }: ColorGenerationParams): string[] {
  const seedNumber = parseInt(currentSeed.slice(-6), 16) || 12345;
  
  return [
    randomColor({ luminosity: 'dark', seed: seedNumber }),
    ...randomColor({ seed: seedNumber + 50, count: parts - 2 }),
    randomColor({ luminosity: 'light', seed: seedNumber + 100 })
  ];
}

/**
 * Full Random generator - completely random HSL colors
 * From FarbVelo lib/generate-random-colors.js lines 60-63
 */
function generateFullRandom({ parts, colorMode, random }: ColorGenerationParams): string[] {
  const colors: string[] = [];
  
  for (let i = 0; i < parts; i++) {
    const hue = random() * 360;
    const saturation = random() * 100;
    const lightness = random() * 100;
    colors.push(coordsToHex(hue, saturation, lightness, colorMode));
  }
  
  return colors;
}
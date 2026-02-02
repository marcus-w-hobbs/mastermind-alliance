/**
 * URL Parameter System for Mastermind Color Palette
 * Inspired by farbvelo.elastiq.ch URL tracking approach
 */

export interface MastermindURLState {
  // Core generation parameters
  currentSeed: string;
  amount: number;
  generatorFunction: 'Legacy' | 'Hue Bingo' | 'Simplex Noise' | 'RandomColor.js' | 'Full Random';
  colorMode: 'hsluv' | 'oklch' | 'hcl' | 'hsl' | 'hcg' | 'hsv' | 'hpluv';
  minHueDistance: number;
  
  // Farbvelo-inspired advanced parameters
  padding: number;
  interpolationColorModel: 'lab' | 'lch' | 'rgb' | 'oklab';
  colorsInGradient: number;
  
  // Mastermind-specific parameters
  personas: string[];
  textContrastMode: 'normal' | 'high';
  showBackground: boolean;
  showGlow: boolean;
  colorBleed: boolean;
}

// Compact URL parameter mapping (inspired by farbvelo)
const URL_PARAM_MAP = [
  { key: "s", prop: "currentSeed" as keyof MastermindURLState },
  { key: "a", prop: "amount" as keyof MastermindURLState, parser: parseInt },
  { key: "f", prop: "generatorFunction" as keyof MastermindURLState },
  { key: "c", prop: "colorMode" as keyof MastermindURLState },
  { key: "md", prop: "minHueDistance" as keyof MastermindURLState, parser: parseInt },
  { key: "p", prop: "padding" as keyof MastermindURLState, parser: parseFloat },
  { key: "im", prop: "interpolationColorModel" as keyof MastermindURLState },
  { key: "cg", prop: "colorsInGradient" as keyof MastermindURLState, parser: parseInt },
  { key: "ps", prop: "personas" as keyof MastermindURLState, parser: (val: string) => val.split(',').filter(Boolean) },
  { key: "tc", prop: "textContrastMode" as keyof MastermindURLState },
  { key: "bg", prop: "showBackground" as keyof MastermindURLState, parser: (val: string) => val === '1' },
  { key: "glow", prop: "showGlow" as keyof MastermindURLState, parser: (val: string) => val === '1' },
  { key: "bleed", prop: "colorBleed" as keyof MastermindURLState, parser: (val: string) => val === '1' },
] as const;

// Default state for new palettes
export const DEFAULT_URL_STATE: MastermindURLState = {
  currentSeed: generateRandomSeed(),
  amount: 3,
  generatorFunction: 'Legacy',
  colorMode: 'hsluv',
  minHueDistance: 30,
  padding: 0.175,
  interpolationColorModel: 'lab',
  colorsInGradient: 3,
  personas: [],
  textContrastMode: 'normal',
  showBackground: true,
  showGlow: true,
  colorBleed: true,
};

/**
 * Generate a random seed for palette generation (matches farbvelo format)
 * Uses hexadecimal base (16) and 14 character length like farbvelo
 */
function generateRandomSeed(): string {
  return Math.random().toString(16).substr(2, 14);
}

/**
 * Validate a seed string (farbvelo accepts any non-empty string)
 */
export function validateSeed(seed: string): boolean {
  return typeof seed === 'string' && seed.length > 0;
}

/**
 * Encode mastermind state to URL parameters
 */
export function encodeStateToURL(state: Partial<MastermindURLState>): string {
  const params = new URLSearchParams();
  
  // Use compact parameter mapping
  URL_PARAM_MAP.forEach(({ key, prop }) => {
    const value = state[prop];
    if (value !== undefined && value !== null) {
      if (prop === 'personas' && Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        }
      } else if (typeof value === 'boolean') {
        params.set(key, value ? '1' : '0');
      } else {
        params.set(key, String(value));
      }
    }
  });
  
  return params.toString();
}

/**
 * Decode URL parameters to mastermind state
 */
export function decodeStateFromURL(searchParams: URLSearchParams): Partial<MastermindURLState> {
  const state: Partial<MastermindURLState> = {};
  
  URL_PARAM_MAP.forEach((item) => {
    const { key, prop } = item;
    const parser = 'parser' in item ? item.parser : undefined;
    const value = searchParams.get(key);
    if (value !== null) {
      try {
        if (parser) {
          (state as Record<string, unknown>)[prop] = parser(value);
        } else {
          (state as Record<string, unknown>)[prop] = value;
        }
      } catch (error) {
        console.warn(`Failed to parse URL parameter ${key}:`, error);
      }
    }
  });
  
  return state;
}

/**
 * Merge URL state with defaults, ensuring all required fields are present
 */
export function mergeWithDefaults(urlState: Partial<MastermindURLState>): MastermindURLState {
  return {
    ...DEFAULT_URL_STATE,
    ...urlState,
  };
}

/**
 * Update browser URL without triggering navigation
 */
export function updateBrowserURL(state: Partial<MastermindURLState>, replace = false): void {
  if (typeof window === 'undefined') return;
  
  const searchParams = encodeStateToURL(state);
  const newURL = `${window.location.pathname}${searchParams ? '?' + searchParams : ''}`;
  
  if (replace) {
    window.history.replaceState(null, '', newURL);
  } else {
    window.history.pushState(null, '', newURL);
  }
}

/**
 * Get current URL state
 */
export function getCurrentURLState(): Partial<MastermindURLState> {
  if (typeof window === 'undefined') return {};
  
  const searchParams = new URLSearchParams(window.location.search);
  return decodeStateFromURL(searchParams);
}

/**
 * Create a shareable URL for the current palette state
 */
export function createShareableURL(state: Partial<MastermindURLState>, baseURL?: string): string {
  const base = baseURL || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');
  const params = encodeStateToURL(state);
  return `${base}${params ? '?' + params : ''}`;
}

/**
 * Validate that a URL state has valid values
 */
export function validateURLState(state: Partial<MastermindURLState>): string[] {
  const errors: string[] = [];
  
  if (state.amount && (state.amount < 1 || state.amount > 20)) {
    errors.push('Amount must be between 1 and 20');
  }
  
  if (state.minHueDistance && (state.minHueDistance < 0 || state.minHueDistance > 360)) {
    errors.push('Min hue distance must be between 0 and 360');
  }
  
  if (state.padding && (state.padding < 0 || state.padding > 1)) {
    errors.push('Padding must be between 0 and 1');
  }
  
  if (state.colorsInGradient && (state.colorsInGradient < 2 || state.colorsInGradient > 10)) {
    errors.push('Colors in gradient must be between 2 and 10');
  }
  
  return errors;
}
# Color Palette Generation System

Advanced color palette generation extracted from FarbVelo, adapted for Next.js/React.

## Quick Start

```tsx
import { ColorPaletteGenerator } from '@/components/color-palette/ColorPaletteGenerator';

// Complete component with all features
<ColorPaletteGenerator 
  initialSettings={{ 
    generatorFunction: 'Hue Bingo', 
    amount: 8,
    colorMode: 'oklch' 
  }}
  showControls={true}
  showWCAGAnalysis={true}
/>
```

## Basic Hook Usage

```tsx
import { useColorPalette } from '@/lib/color-generation';

function MyComponent() {
  const { 
    colors, 
    generateNewPalette, 
    updateSettings,
    settings 
  } = useColorPalette({
    generatorFunction: 'Legacy',
    amount: 6,
    colorMode: 'hsluv'
  });
  
  return (
    <div>
      {colors.map(color => (
        <div key={color} style={{ backgroundColor: color }} />
      ))}
      <button onClick={() => generateNewPalette()}>
        New Palette
      </button>
    </div>
  );
}
```

## Available Features

### Generation Algorithms
- **`'Legacy'`** - Original vaporwave style generator
- **`'Hue Bingo'`** - Controlled hue separation with lightness ramps  
- **`'Simplex Noise'`** - Organic color transitions using mathematical noise
- **`'RandomColor.js'`** - Integration with popular randomcolor library
- **`'Full Random'`** - Completely random HSL generation

### Color Spaces
- **`'hsluv'`** - Perceptually uniform (recommended)
- **`'oklch'`** - Modern perceptual color space
- **`'lab'`** - Device-independent mixing
- **`'hsl'`** - Standard HSL
- **`'rgb'`** - Standard RGB
- **`'hcl'`**, **`'hcg'`**, **`'hsv'`** - Additional options

### Interactive Controls
- **Keyboard**: Space (new palette), ← → (padding), Cmd+M (mirror), Cmd+W (WCAG)
- **Touch**: Swipe horizontally (padding), swipe up (new palette), swipe down (mirror)
- **Real-time**: All parameters update live

### Advanced Features
- **Color Mirroring**: Create symmetric patterns
- **WCAG Analysis**: Accessibility contrast checking (AA/AAA standards)
- **Multiple Interpolation**: Lab, OKLab, Spectral, RGB, etc.
- **Export Formats**: Hex, RGB, HSL, CSS, JSON

## Components

### ColorDisplay
```tsx
import { ColorDisplay } from '@/components/color-palette/ColorDisplay';

<ColorDisplay 
  colors={['#ff0000', '#00ff00', '#0000ff']}
  size="lg"
  showValues={true}
  copyable={true}
  format="hex"
/>
```

### ColorControls  
```tsx
import { ColorControls } from '@/components/color-palette/ColorControls';

<ColorControls
  settings={settings}
  onSettingsChange={updateSettings}
  mirrorOptions={mirrorOptions}
  onMirrorOptionsChange={updateMirrorOptions}
  includeWCAGAnalysis={includeWCAGAnalysis}
  onWCAGAnalysisChange={setIncludeWCAGAnalysis}
  onGenerateNew={generateNewPalette}
  onReset={resetToDefaults}
/>
```

## Utility Functions

```tsx
import { 
  coordsToHex, 
  convertColor, 
  calculateContrastRatio,
  meetsWCAGAA 
} from '@/lib/color-generation';

// Convert color coordinates to hex
const color = coordsToHex(180, 75, 50, 'hsluv');

// Convert between formats  
const rgb = convertColor('#ff0000', 'rgb');

// Check WCAG contrast
const contrast = calculateContrastRatio('#000000', '#ffffff'); // 21
const accessible = meetsWCAGAA('#000000', '#ffffff'); // true
```

## Demo Page

Visit `/color-palette-demo` to see all features in action with interactive examples and API documentation.

## Dependencies

The system requires these packages (already added to package.json):
- `chroma-js` - Color manipulation and conversion
- `hsluv` - Perceptually uniform color space
- `randomcolor` - Popular color generation library  
- `seedrandom` - Deterministic random number generation
- `simplex-noise` - Mathematical noise functions
- `spectral.js` - Realistic color mixing
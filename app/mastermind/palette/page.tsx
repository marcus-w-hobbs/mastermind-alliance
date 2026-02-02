'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ColorPaletteGenerator } from '@/components/color-palette/ColorPaletteGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Palette } from 'lucide-react';
import { PersonaId, personasRegistry } from '@/lib/personas/personas-registry';
import { findNormalContrastTextColor, extractLightness } from '@/lib/color-generation/utils/colorUtils';
import { calculateContrastRatio } from '@/lib/color-generation/utils/wcagContrast';
import type { TextContrastMode } from '@/lib/color-generation/types';
import { cn } from '@/lib/utils';
import { createColorThemeVars } from '@/lib/color-generation/utils/colorUtils';
import Image from 'next/image';
import '../farbvelo-effects.css';
import "../../safe-area.css";

// Helper function to find optimal text color for pills (same logic as LoremIpsumDisplay)
function findOptimalTextColor(backgroundColor: string, palette: string[]): string {
  const candidates = ['#ffffff', '#000000', ...palette.filter(c => c !== backgroundColor)];
  
  let bestColor = '#000000';
  let bestContrast = 0;
  
  for (const candidate of candidates) {
    const contrast = calculateContrastRatio(backgroundColor, candidate);
    if (contrast > bestContrast) {
      bestContrast = contrast;
      bestColor = candidate;
    }
  }
  
  return bestColor;
}

// Get text color using same logic as Text Contrast Examples
function getPillTextColor(backgroundColor: string, palette: string[], useHighContrast: boolean = true): string {
  if (!backgroundColor || palette.length === 0) {
    // Fallback for when palette isn't loaded yet
    const hex = backgroundColor?.replace('#', '') || '';
    if (hex.length !== 6) return '#ffffff';
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  return useHighContrast 
    ? findOptimalTextColor(backgroundColor, palette)
    : findNormalContrastTextColor(backgroundColor, palette);
}


/**
 * Mastermind-specific color palette generator page
 * Dynamically adjusts color count based on selected personas
 * Integrates with sessionStorage for palette persistence
 */
function MastermindPaletteContent() {
  const searchParams = useSearchParams();
  const [personaIds, setPersonaIds] = useState<PersonaId[]>([]);
  const [requiredColors, setRequiredColors] = useState(3);
  const [currentPalette, setCurrentPalette] = useState<string[]>([]);
  const [textContrastMode, setTextContrastMode] = useState<TextContrastMode>('normal');
  const [currentSeed, setCurrentSeed] = useState<string>('');
  
  // Mastermind styling states (fixed values for preview consistency)
  const showBackground = true;
  const showGlow = true;
  const colorBleed = true;
  
  // Parse URL parameters
  useEffect(() => {
    const personasParam = searchParams.get('personas');
    const colorsParam = searchParams.get('colors');
    const seedParam = searchParams.get('s'); // 's' parameter for seed (matching farbvelo)
    
    if (personasParam) {
      const personas = personasParam.split(',').filter(Boolean) as PersonaId[];
      setPersonaIds(personas);
    }
    
    if (colorsParam) {
      const colors = parseInt(colorsParam, 10);
      setRequiredColors(Math.max(3, colors));
    } else {
      // Calculate from personas: user + N personas = N+1 minimum
      const calculatedColors = Math.max(3, personaIds.length + 1);
      setRequiredColors(calculatedColors);
    }
    
    if (seedParam) {
      setCurrentSeed(seedParam);
    } else {
      // Generate a new random seed if none provided
      const newSeed = Math.random().toString(16).substr(2, 14);
      setCurrentSeed(newSeed);
    }
  }, [searchParams, personaIds.length]);

  // Update sessionStorage when text contrast mode changes
  useEffect(() => {
    if (currentPalette.length > 0) {
      const paletteData = {
        palette: currentPalette,
        personaAssignments: {},
        userColorIndex: 0,
        textContrastMode,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('mastermind-palette', JSON.stringify(paletteData));
      
      // Trigger custom storage event for same-tab components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'mastermind-palette',
        newValue: JSON.stringify(paletteData),
        storageArea: sessionStorage
      }));
      
      // Optional: Communicate to parent window
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'palette-updated', 
          palette: paletteData 
        }, window.location.origin);
      }
    }
  }, [textContrastMode, currentPalette]);

  const handleGoBack = () => {
    // Close the window if opened in a new tab, otherwise navigate back
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  const handlePaletteChange = (palette: string[]) => {
    // Update local state for live preview
    setCurrentPalette(palette);
    
    // Store palette in sessionStorage for mastermind page
    const paletteData = {
      palette,
      personaAssignments: {},
      userColorIndex: 0,
      textContrastMode,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem('mastermind-palette', JSON.stringify(paletteData));
    
    // Trigger custom storage event for same-tab components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'mastermind-palette',
      newValue: JSON.stringify(paletteData),
      storageArea: sessionStorage
    }));
    
    // Optional: Communicate palette change to parent window
    if (window.opener) {
      window.opener.postMessage({ 
        type: 'palette-updated', 
        palette: paletteData 
      }, window.location.origin);
    }
  };

  const handleSeedChange = (newSeed: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('s', newSeed);
    
    // Keep existing parameters
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
    
    setCurrentSeed(newSeed);
  };

  // Generate theme vars for background gradient
  const getThemeVars = () => {
    if (!currentPalette.length) return {};
    return createColorThemeVars(currentPalette);
  };

  // Sample messages for preview - one user message + one per persona
  const sampleMessages = [
    { id: '1', role: 'user', content: 'What do you think about the nature of consciousness?', personaId: 'user' },
    ...personaIds.map((personaId, index) => ({
      id: `${index + 2}`,
      role: 'assistant',
      content: `Consciousness from ${personasRegistry[personaId]?.name || personaId}'s perspective reveals unique insights about the nature of awareness and reality...`,
      personaId
    }))
  ];

  const getColorForEntity = (entityType: 'user' | 'persona', personaId?: PersonaId) => {
    if (!currentPalette.length) return undefined;
    
    if (entityType === 'user') {
      return currentPalette[0]; // User color (first/darkest)
    } else if (entityType === 'persona' && personaId) {
      const personaIndex = personaIds.indexOf(personaId);
      if (personaIndex >= 0 && personaIndex < currentPalette.length - 1) {
        return currentPalette[personaIndex + 1];
      }
    }
    return currentPalette[1] || currentPalette[0];
  };

  // Get optimal text color based on contrast mode and background (matching mastermind page)
  const getTextColor = (backgroundColor: string) => {
    if (!currentPalette.length) {
      try {
        const lightness = extractLightness(backgroundColor);
        return lightness > 0.5 ? '#000000' : '#ffffff';
      } catch {
        return '#ffffff';
      }
    }

    const contrastMode = textContrastMode || 'normal';
    
    if (contrastMode === 'normal') {
      // Use palette-based harmonious text coloring
      return findNormalContrastTextColor(backgroundColor, currentPalette);
    } else {
      // Use high contrast black/white
      try {
        const lightness = extractLightness(backgroundColor);
        return lightness > 0.5 ? '#000000' : '#ffffff';
      } catch {
        return '#ffffff';
      }
    }
  };

  return (
    <div 
      className={cn(
        "min-h-screen relative mastermind-inter-font",
        showBackground && "mastermind-has-background",
        showGlow && "mastermind-has-glow",
        colorBleed && "mastermind-has-bleed"
      )}
      style={{
        ...getThemeVars(),
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
      suppressHydrationWarning
    >
      {/* Farbvelo-style background gradient */}
      {showBackground && currentPalette.length > 0 && (
        <div 
          className="fixed inset-0 opacity-30 scale-125 transition-all duration-300 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, var(--gradient-soft))`,
            zIndex: -1
          }}
        />
      )}

      {/* Preview message elements - positioned under Active Personas card */}
      {currentPalette.length > 0 && (
        <div className="absolute top-64 left-4 right-96 pointer-events-none z-[15]">
          <div className="flex flex-col gap-4 max-w-3xl">
            {sampleMessages.map((message, index) => {
              const nextMessage = sampleMessages[index + 1];
              const isUser = message.role === 'user';
              const persona = isUser ? null : personasRegistry[message.personaId as PersonaId];
              const baseColor = isUser ? 
                getColorForEntity('user') : 
                getColorForEntity('persona', message.personaId as PersonaId);
              const backgroundColor = baseColor ? `${baseColor}CC` : 'hsl(var(--muted))'; // 80% opacity
              const textColor = baseColor ? `${getTextColor(baseColor)}CC` : 'currentColor'; // 80% opacity
              const nextColor = nextMessage ? (
                nextMessage.role === 'user' ? 
                  getColorForEntity('user') : 
                  getColorForEntity('persona', nextMessage.personaId as PersonaId)
              ) : undefined;
              
              return (
                <div 
                  key={message.id}
                  className={cn(
                    "relative overflow-hidden min-h-[120px] flex w-full",
                    showGlow && "mastermind-message-glow",
                    colorBleed && nextColor && "mastermind-message-bleed"
                  )}
                  style={{
                    backgroundColor: backgroundColor,
                    '--message-color': baseColor || 'hsl(var(--muted))',
                    '--message-next-color': nextColor || baseColor || 'hsl(var(--muted))',
                  } as React.CSSProperties}
                >
                  {/* Gradient overlay like in mockup */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/15" />
                  
                  {/* Avatar space (left for personas, empty space for user) */}
                  <div className="relative z-10 flex-shrink-0 w-40 p-4 min-h-full">
                    {!isUser && (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-32 h-32 overflow-hidden">
                          <Image 
                            src={`/avatars/${message.personaId}.png`} 
                            alt={persona?.name || message.personaId} 
                            width={128} 
                            height={128}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div 
                          className="text-sm mt-2 text-center w-32 leading-tight"
                          style={{ 
                            color: textColor,
                            fontWeight: 900,
                            fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)'
                          }}
                        >
                          {persona?.name || message.personaId}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Message content - always left-aligned, same starting position */}
                  <div className="relative z-10 flex-1 p-6 flex items-center">
                    <div 
                      className="text-sm leading-relaxed text-left"
                      style={{ color: textColor }}
                    >
                      {message.content}
                    </div>
                  </div>
                  
                  {/* Avatar space (right for user, empty space for personas) */}
                  <div className="relative z-10 flex-shrink-0 w-40 p-4 min-h-full">
                    {isUser && (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-32 h-32 overflow-hidden">
                          <Image 
                            src="/avatars/user.png" 
                            alt="You" 
                            width={128} 
                            height={128}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div 
                          className="text-sm mt-2 text-center w-32 leading-tight"
                          style={{ 
                            color: textColor,
                            fontWeight: 900,
                            fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)'
                          }}
                        >
                          You
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Layout - Sidebar like farbvelo */}
      <div className="relative z-10 bg-transparent">
        <div className="flex h-screen">
          {/* Left Content Area */}
          <div className="flex-1 p-4 overflow-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Palette className="w-8 h-8" />
              Mastermind Palette
            </h1>
            <p className="text-muted-foreground mt-1">
              Design colors for your AI persona roundtable
            </p>
          </div>
          
        </div>


        {/* Persona Context */}
        {(personaIds.length > 0 || requiredColors >= 3) && (
          <Card className="mb-6 bg-transparent border-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {personaIds.length > 0 ? `Active Personas (${personaIds.length})` : 'Color Assignment Preview'}
              </CardTitle>
              <CardDescription>
                {personaIds.length > 0 
                  ? 'Colors will be assigned to each persona plus the user'
                  : 'How colors will be assigned for user and personas'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {/* User */}
                <Badge 
                  variant="secondary"
                  style={{
                    backgroundColor: currentPalette[0] || '#f3f4f6',
                    color: getPillTextColor(currentPalette[0] || '#f3f4f6', currentPalette, textContrastMode === 'high'),
                    border: '1px solid rgba(0,0,0,0.2)'
                  }}
                >
                  User
                </Badge>
                
                {/* Persona pills */}
                {personaIds.map((personaId, index) => (
                  <Badge 
                    key={personaId} 
                    variant="secondary"
                    style={{
                      backgroundColor: currentPalette[index + 1] || '#6b7280',
                      color: getPillTextColor(currentPalette[index + 1] || '#6b7280', currentPalette, textContrastMode === 'high'),
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    {personasRegistry[personaId]?.name || personaId}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <strong>Required colors:</strong> {requiredColors} 
                {personaIds.length > 0 
                  ? ` (${personaIds.length} personas + User)`
                  : ' (including user)'
                }
              </div>
            </CardContent>
          </Card>
        )}

          </div>

          {/* Right Sidebar - Controls (25% wider) */}
          <div className="w-96 bg-transparent border-l border-white/20 p-4 overflow-auto">
            <ColorPaletteGenerator 
              onPaletteChange={handlePaletteChange}
              onTextContrastModeChange={setTextContrastMode}
              onSeedChange={handleSeedChange}
              colorCount={requiredColors}
              showLoremIpsum={false}
              className="bg-transparent"
              initialSettings={{
                amount: requiredColors,
                colorsInGradient: requiredColors, // generation colors = color count
                seed: currentSeed
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MastermindPalettePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <MastermindPaletteContent />
    </Suspense>
  );
}
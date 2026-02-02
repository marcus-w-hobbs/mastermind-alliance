'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTopics } from '@/components/topics-provider';
import { cn } from '@/lib/utils';
import { findNormalContrastTextColor } from '@/lib/color-generation/utils/colorUtils';

interface ConversationStarterCardsProps {
  onCardClick: (content: string) => void;
  className?: string;
  palette?: string[];
  textContrastMode?: 'normal' | 'high';
}

function ConversationStarterCardsComponent({ onCardClick, className, palette }: ConversationStarterCardsProps) {
  const { getNextTopic } = useTopics();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [cardsPerView, setCardsPerView] = useState(1);

  // Memoize the mirrored colors array to prevent regeneration on every render
  const mirroredColors = useMemo(() => {
    if (!palette || palette.length === 0) {
      return [];
    }
    // Create a simple mirrored array that includes all colors: [A,B,C,D,C,B,A]
    // This ensures every color in the palette appears in the sequence
    const reversedPalette = [...palette].reverse();
    return [...palette, ...reversedPalette.slice(1, -1)];
  }, [palette]);

  // Get colors for a specific card index using the stable mirrored colors
  const getCardColors = useCallback((index: number) => {
    if (mirroredColors.length === 0) {
      return { backgroundColor: undefined, textColor: undefined };
    }
    
    // Use the mirrored colors array to cycle through
    const baseColor = mirroredColors[index % mirroredColors.length];
    const backgroundColor = `${baseColor}E6`; // 90% opacity
    
    // Always use normal contrast for harmonious color text (use base color for contrast calculation)
    const textColor = palette ? findNormalContrastTextColor(baseColor, palette) : '#ffffff';

    return { backgroundColor, textColor };
  }, [mirroredColors, palette]);

  // Generate topics once and keep them stable - using useState initializer
  const [topics] = useState<string[]>(() => {
    const topicsNeeded = 250; // Generate a fixed number upfront
    const initialTopics: string[] = [];
    for (let i = 0; i < topicsNeeded; i++) {
      initialTopics.push(getNextTopic());
    }
    return initialTopics;
  });

  // Handle responsive layout without regenerating topics
  useEffect(() => {
    const updateCardsPerView = () => {
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const isDesktop = window.innerWidth >= 1024;
      
      let newCardsPerView = 1; // mobile default
      if (isTablet) newCardsPerView = 2;
      if (isDesktop) newCardsPerView = 3;
      
      setCardsPerView(prev => prev !== newCardsPerView ? newCardsPerView : prev);
    };

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []); // No dependencies - this only handles layout

  // Add more topics when scrolling near the end (disabled to prevent infinite loops)
  const handleScroll = useCallback(() => {
    // Temporarily disabled to prevent infinite loops
    // Will implement proper pagination later if needed
  }, []);

  const handleCardClick = (topic: string) => {
    onCardClick(topic);
  };

  const handleKeyDown = (e: React.KeyboardEvent, topic: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(topic);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-4 pb-3 scroll-smooth snap-x snap-mandatory scrollbar-hide px-4"
        onScroll={handleScroll}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          paddingLeft: 'calc(50vw - 50% + 1rem)',
          paddingRight: 'calc(50vw - 50% + 1rem)'
        }}
      >
        {topics.map((topic, index) => {
          // Card width calculations ensuring visible peek on all layouts
          let cardWidth = 'calc(100vw - 8rem)'; // mobile: leave more space for peek
          if (cardsPerView === 2) cardWidth = 'calc(70vw - 3rem)'; // tablet: ensure peek is visible  
          if (cardsPerView === 3) cardWidth = 'calc(60vw - 2rem)'; // desktop: ensure peek is visible
          
          const { backgroundColor, textColor } = getCardColors(index);
          
          return (
            <Card
              key={`${topic.substring(0, 50)}-${index}`}
              className={cn(
                "cursor-pointer transition-all shrink-0 snap-center",
                backgroundColor ? "border-white/20" : "hover:bg-muted/50"
              )}
              style={{ 
                width: cardWidth, 
                maxWidth: '400px',
                backgroundColor: backgroundColor || undefined,
                color: textColor || undefined
              }}
              onClick={() => handleCardClick(topic)}
              onKeyDown={(e) => handleKeyDown(e, topic)}
              tabIndex={0}
              role="button"
              aria-label={`Conversation starter: ${topic.substring(0, 100)}...`}
            >
              <CardContent className="p-4 md:p-6">
                <p className={cn(
                  "text-sm md:text-base leading-relaxed",
                  topic.length > 200 ? "text-xs md:text-sm" : "" // Smaller text for longer topics
                )}>
                  {topic}
                </p>
              </CardContent>
            </Card>
          );
        })}
        
        {/* Spacer to ensure last card can be fully scrolled into view */}
        <div className="w-4 shrink-0" />
      </div>
    </div>
  );
}

export const ConversationStarterCards = React.memo(ConversationStarterCardsComponent, (prevProps, nextProps) => {
  // Only re-render if palette or className actually changes
  const paletteEqual = JSON.stringify(prevProps.palette) === JSON.stringify(nextProps.palette);
  const classNameEqual = prevProps.className === nextProps.className;
  const textContrastModeEqual = prevProps.textContrastMode === nextProps.textContrastMode;
  
  // Return true if props are equal (should NOT re-render)
  return paletteEqual && classNameEqual && textContrastModeEqual;
});

// CSS to hide scrollbars completely
const scrollbarHideStyles = `
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'conversation-starter-scrollbar-hide';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = scrollbarHideStyles;
    document.head.appendChild(style);
  }
}
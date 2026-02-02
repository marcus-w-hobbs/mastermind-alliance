/* eslint-disable */
// @ts-nocheck
'use client';

import { useEffect, useCallback } from 'react';

export interface ColorKeyboardControlsOptions {
  onNewColors?: () => void;
  onPaddingIncrease?: () => void;
  onPaddingDecrease?: () => void;
  onToggleMirror?: () => void;
  onToggleWCAG?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for keyboard shortcuts in color palette interface
 * Extracted from FarbVelo main.js keyboard event handlers
 */
export function useColorKeyboardControls({
  onNewColors,
  onPaddingIncrease,
  onPaddingDecrease,
  onToggleMirror,
  onToggleWCAG,
  onEscape,
  enabled = true,
  preventDefault = true
}: ColorKeyboardControlsOptions) {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    
    switch (event.code) {
      case 'Space':
        if (preventDefault) event.preventDefault();
        onNewColors?.();
        break;
        
      case 'ArrowRight':
        if (preventDefault) event.preventDefault();
        onPaddingIncrease?.();
        break;
        
      case 'ArrowLeft':
        if (preventDefault) event.preventDefault();
        onPaddingDecrease?.();
        break;
        
      case 'KeyM':
        if (event.ctrlKey || event.metaKey) {
          if (preventDefault) event.preventDefault();
          onToggleMirror?.();
        }
        break;
        
      case 'KeyW':
        if (event.ctrlKey || event.metaKey) {
          if (preventDefault) event.preventDefault();
          onToggleWCAG?.();
        }
        break;
        
      case 'Escape':
        if (preventDefault) event.preventDefault();
        onEscape?.();
        break;
    }
  }, [
    enabled,
    preventDefault,
    onNewColors,
    onPaddingIncrease,
    onPaddingDecrease,
    onToggleMirror,
    onToggleWCAG,
    onEscape
  ]);
  
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
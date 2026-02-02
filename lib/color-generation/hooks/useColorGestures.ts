/* eslint-disable */
// @ts-nocheck
'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface ColorGestureOptions {
  onPaddingChange?: (delta: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  enabled?: boolean;
  sensitivity?: number;
  threshold?: number;
}

/**
 * Hook for touch/swipe gesture controls in color palette interface
 * Extracted from FarbVelo main.js pointer event handlers
 */
export function useColorGestures({
  onPaddingChange,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  enabled = true,
  sensitivity = 0.001,
  threshold = 50
}: ColorGestureOptions) {
  
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isTouchingRef = useRef(false);
  const lastXRef = useRef(0);
  
  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (!enabled) return;
    
    isTouchingRef.current = true;
    lastXRef.current = event.clientX;
    touchStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now()
    };
  }, [enabled]);
  
  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!enabled || !isTouchingRef.current) return;
    
    const deltaX = event.clientX - lastXRef.current;
    
    // Adjust padding based on horizontal movement
    if (onPaddingChange && Math.abs(deltaX) > 1) {
      const paddingDelta = deltaX * sensitivity;
      onPaddingChange(paddingDelta);
      lastXRef.current = event.clientX;
    }
  }, [enabled, onPaddingChange, sensitivity]);
  
  const handlePointerUp = useCallback((event: PointerEvent) => {
    if (!enabled || !isTouchingRef.current || !touchStartRef.current) return;
    
    isTouchingRef.current = false;
    
    const deltaX = event.clientX - touchStartRef.current.x;
    const deltaY = event.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Detect swipe gestures (quick movements above threshold)
    if (deltaTime < 300) { // Quick gesture
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX > threshold && absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else if (absY > threshold && absY > absX) {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }
    
    touchStartRef.current = null;
  }, [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);
  
  const handlePointerCancel = useCallback(() => {
    isTouchingRef.current = false;
    touchStartRef.current = null;
  }, []);
  
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerCancel);
    
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [enabled, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);
  
  return {
    isTouching: isTouchingRef.current
  };
}
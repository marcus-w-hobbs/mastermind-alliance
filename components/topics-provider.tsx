'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Topics, createRandomizedIndices } from '@/types/topics';

interface TopicsContextType {
  getNextTopic: () => string;
  getCurrentTopic: () => string | null;
  remainingCount: () => number;
  resetShuffle: () => void;
}

const TopicsContext = createContext<TopicsContextType | undefined>(undefined);

const STORAGE_KEY = 'topicIndices';
const CURRENT_INDEX_KEY = 'currentTopicIndex';

function getStoredIndices(): number[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredIndices(indices: number[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(indices));
  } catch {
    // Storage failed, continue without persistence
  }
}

function getStoredCurrentIndex(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const stored = sessionStorage.getItem(CURRENT_INDEX_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setStoredCurrentIndex(index: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(CURRENT_INDEX_KEY, index.toString());
  } catch {
    // Storage failed, continue without persistence
  }
}

export function TopicsProvider({ children }: { children: React.ReactNode }) {
  const [indices, setIndices] = useState<number[]>(() => {
    const stored = getStoredIndices();
    if (stored && stored.length > 0) {
      return stored;
    }
    const newIndices = createRandomizedIndices();
    setStoredIndices(newIndices);
    return newIndices;
  });

  const currentIndexRef = useRef<number>(0);

  // Initialize the ref from storage after component mounts
  useEffect(() => {
    const storedIndex = getStoredCurrentIndex();
    currentIndexRef.current = storedIndex;
  }, []);

  const getNextTopic = useCallback((): string => {
    const topicIndex = indices[currentIndexRef.current];
    const topic = Topics.get(topicIndex);
    
    if (!topic) {
      // Fallback to random topic if something goes wrong
      return Topics.getRandom();
    }
    
    // Increment index for next call
    currentIndexRef.current = (currentIndexRef.current + 1) % indices.length;
    setStoredCurrentIndex(currentIndexRef.current);
    
    return topic;
  }, [indices]);

  const getCurrentTopic = useCallback((): string | null => {
    if (currentIndexRef.current === 0) return null; // No topic has been retrieved yet
    
    const prevIndex = currentIndexRef.current === 0 ? indices.length - 1 : currentIndexRef.current - 1;
    const topicIndex = indices[prevIndex];
    return Topics.get(topicIndex) || null;
  }, [indices]);

  const remainingCount = useCallback((): number => {
    return indices.length - currentIndexRef.current;
  }, [indices.length]);

  const resetShuffle = useCallback((): void => {
    const newIndices = createRandomizedIndices();
    setIndices(newIndices);
    currentIndexRef.current = 0;
    setStoredIndices(newIndices);
    setStoredCurrentIndex(0);
  }, []);

  const value: TopicsContextType = {
    getNextTopic,
    getCurrentTopic,
    remainingCount,
    resetShuffle,
  };

  return (
    <TopicsContext.Provider value={value}>
      {children}
    </TopicsContext.Provider>
  );
}

export function useTopics(): TopicsContextType {
  const context = useContext(TopicsContext);
  if (context === undefined) {
    throw new Error('useTopics must be used within a TopicsProvider');
  }
  return context;
}
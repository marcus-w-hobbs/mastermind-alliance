"use client";

import { useState, useEffect, useCallback } from "react";
import { PersonaId, DEFAULT_PERSONAS, getDefaultPersonaId } from "@/lib/personas/personas-registry";

export type PageType = keyof typeof DEFAULT_PERSONAS;

/**
 * Custom hook to persist persona selections in session storage
 * @param pageType The page type ('chat', 'tools', 'mastermind')
 * @returns [selectedPersonas, setSelectedPersonas, isLoaded]
 */
export function usePersistedPersonas(pageType: PageType): [PersonaId[], (personas: PersonaId[]) => void, boolean] {
  const [selectedPersonas, setSelectedPersonasState] = useState<PersonaId[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const sessionKey = `${pageType}-personas`;

  // Load personas from session storage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(sessionKey);
      if (stored) {
        const parsed = JSON.parse(stored) as PersonaId[];
        // Validate that all stored personas are valid, fallback to defaults if any are invalid
        const validPersonas = parsed.filter(id => {
          try {
            // Simple validation - if getDefaultPersonaId() doesn't throw, the persona exists
            return typeof id === 'string' && id.length > 0;
          } catch {
            return false;
          }
        });
        
        if (validPersonas.length > 0) {
          setSelectedPersonasState(validPersonas);
        } else {
          // No valid personas found, use defaults
          setSelectedPersonasState([...DEFAULT_PERSONAS[pageType]]);
        }
      } else {
        // No stored personas, use defaults
        setSelectedPersonasState([...DEFAULT_PERSONAS[pageType]]);
      }
    } catch (error) {
      console.error(`[use-persisted-personas]: Error loading personas for ${pageType}:`, error);
      // Fallback to defaults on any error
      setSelectedPersonasState([...DEFAULT_PERSONAS[pageType]]);
    } finally {
      setIsLoaded(true);
    }
  }, [pageType, sessionKey]);

  // Function to update both state and session storage (memoized to prevent infinite loops)
  const setSelectedPersonas = useCallback((personas: PersonaId[]) => {
    try {
      // Validate personas before storing
      const validPersonas = personas.filter(id => {
        try {
          return typeof id === 'string' && id.length > 0;
        } catch {
          return false;
        }
      });

      // If no valid personas, fallback to page default
      const personasToStore = validPersonas.length > 0 ? validPersonas : [getDefaultPersonaId()];
      
      setSelectedPersonasState(personasToStore);
      sessionStorage.setItem(sessionKey, JSON.stringify(personasToStore));
    } catch (error) {
      console.error(`[use-persisted-personas]: Error storing personas for ${pageType}:`, error);
      // Still update state even if storage fails
      setSelectedPersonasState(personas);
    }
  }, [pageType, sessionKey]); // Dependencies: pageType and sessionKey are stable

  return [selectedPersonas, setSelectedPersonas, isLoaded];
}
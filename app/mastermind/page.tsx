"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ConversationStarterCards } from "@/components/ui/conversation-starter-cards";
import { CopyButton } from "@/components/ui/copy-button";
import { ModelId, DEFAULT_MODEL_ID } from "@/lib/models";
import { cn } from "@/lib/utils";
import { PersonaId, personasRegistry } from "@/lib/personas/personas-registry";
import { usePersistedPersonas } from "@/lib/hooks/use-persisted-personas";
import { ChatControls } from "@/components/ui/chat-controls";
import { MastermindMessage, generateMastermindMessageId } from "@/types/mastermind-message";
import { asciiArt } from "@/lib/ascii-art";
import Image from "next/image";
import { generateColors } from "@/lib/color-generation/utils/colorGenerators";
import { extractLightness, createColorThemeVars, findNormalContrastTextColor } from "@/lib/color-generation/utils/colorUtils";
import { MastermindURLState, DEFAULT_URL_STATE, getCurrentURLState, mergeWithDefaults, updateBrowserURL } from "@/lib/color-generation/utils/urlParams";
import seedrandom from "seedrandom";
import "../safe-area.css"
import "./farbvelo-effects.css"

interface MastermindPaletteData {
  palette: string[];
  personaAssignments: { [personaId: string]: number };
  userColorIndex: number;
  textContrastMode?: 'normal' | 'high';
  timestamp: number;
  // URL state for sharing and persistence
  urlState?: MastermindURLState;
}

export default function MastermindPage() {  
  const [modelName, setModelName] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [selectedPersonaIds, setSelectedPersonaIds, isPersonasLoaded] = usePersistedPersonas('mastermind');
  const [messages, setMessages] = useState<MastermindMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentPalette, setCurrentPalette] = useState<MastermindPaletteData | null>(null);
  const [urlState, setUrlState] = useState<MastermindURLState>(DEFAULT_URL_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Farbvelo visual effects state (matching mockup settings)
  const [showBackground, setShowBackground] = useState(true);
  const [showGlow, setShowGlow] = useState(true);
  const [colorBleed, setColorBleed] = useState(true);
  
  // Hydration state to prevent SSR mismatches
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize URL state and handle hydration
  useEffect(() => {
    if (!isPersonasLoaded) return; // Wait for personas to load first
    
    setIsHydrated(true);
    
    // Load URL state first
    const currentURLState = getCurrentURLState();
    const mergedState = mergeWithDefaults(currentURLState);
    setUrlState(mergedState);
    
    // Set personas from URL if available (override persisted personas on initial load only)
    if (mergedState.personas && mergedState.personas.length > 0) {
      console.log('[mastermind]: Setting personas from URL on initial load:', mergedState.personas);
      setSelectedPersonaIds(mergedState.personas as PersonaId[]);
    }
    
    // Set visual effects from URL
    setShowBackground(mergedState.showBackground);
    setShowGlow(mergedState.showGlow);
    setColorBleed(mergedState.colorBleed);
    
    // Check for mock data in sessionStorage (fallback)
    try {
      const mockMessages = sessionStorage.getItem('mock-messages');
      const mockPersonas = sessionStorage.getItem('mock-personas');
      
      if (mockMessages && mockPersonas) {
        const messages = JSON.parse(mockMessages);
        const personas = JSON.parse(mockPersonas);
        
        console.log('[mastermind]: 🎭 Loading mock data:', messages.length, 'messages');
        setMessages(messages);
        
        // Only set personas if not already set from URL
        if (!mergedState.personas || mergedState.personas.length === 0) {
          setSelectedPersonaIds(personas);
        }
        
        setShowWelcome(false);
        
        // Clear mock data so it doesn't persist on refresh
        sessionStorage.removeItem('mock-messages');
        sessionStorage.removeItem('mock-personas');
      }
    } catch (error) {
      console.warn('[mastermind]: Error loading mock data:', error);
    }
  }, [isPersonasLoaded]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: setSelectedPersonaIds is intentionally excluded to prevent infinite loops.
  // It's now memoized in usePersistedPersonas hook, so it's safe to exclude.

  // Pure palette generation function - no URL state dependencies
  const generatePaletteForPersonaCount = useCallback((colorCount: number, personas: PersonaId[]) => {
      // Use DEFAULT_URL_STATE as base to avoid any closure dependencies
      const currentUrlState = DEFAULT_URL_STATE;
      
      // Create new state for palette generation (pure function, no side effects)
      const newState: MastermindURLState = {
        ...currentUrlState,
        amount: colorCount,
        personas: personas,
        currentSeed: Math.random().toString(36).substring(2, 15) // Generate new seed
      };
      
      const random = seedrandom(newState.currentSeed);
      
      try {
        const colors = generateColors(newState.generatorFunction, {
          amount: newState.amount,
          parts: newState.colorsInGradient,
          minHueDiffAngle: newState.minHueDistance,
          colorMode: newState.colorMode,
          currentSeed: newState.currentSeed,
          random
        });

        const paletteData: MastermindPaletteData = {
          palette: colors,
          personaAssignments: {},
          userColorIndex: colors.length - 1, // Always use last color for user in light theme
          textContrastMode: newState.textContrastMode,
          timestamp: Date.now(),
          urlState: newState
        };

        setCurrentPalette(paletteData);
        sessionStorage.setItem('mastermind-palette', JSON.stringify(paletteData));
        notifyPaletteUpdate();
        
        console.log(`[mastermind]: Generated new palette with ${colors.length} colors:`, colors, newState);
        
        return newState; // Return the new state for external URL updates
      } catch (error) {
        console.error('[mastermind]: Error generating palette:', error);
        return newState;
      }
  }, []); // Empty dependencies - pure function with no external dependencies

  // Generate palette when personas are loaded (stable dependencies, no circular refs)
  useEffect(() => {
    if (isPersonasLoaded && selectedPersonaIds.length > 0) {
      const requiredColors = Math.max(3, selectedPersonaIds.length + 1);
      
      // Check if we have an existing palette in sessionStorage
      const storedPalette = sessionStorage.getItem('mastermind-palette');
      if (storedPalette) {
        try {
          const paletteData = JSON.parse(storedPalette);
          
          // If current palette doesn't have enough colors, regenerate with more
          if (paletteData.palette.length < requiredColors) {
            console.log(`[mastermind]: Regenerating palette from ${paletteData.palette.length} to ${requiredColors} colors`);
            generatePaletteForPersonaCount(requiredColors, selectedPersonaIds);
          } else {
            console.log(`[mastermind]: Current palette (${paletteData.palette.length} colors) sufficient for ${selectedPersonaIds.length} personas`);
          }
        } catch (error) {
          console.warn('[mastermind]: Error parsing stored palette:', error);
          generatePaletteForPersonaCount(requiredColors, selectedPersonaIds);
        }
      } else {
        console.log(`[mastermind]: No existing palette, generating ${requiredColors} colors for ${selectedPersonaIds.length} personas`);
        generatePaletteForPersonaCount(requiredColors, selectedPersonaIds);
      }
    }
  }, [isPersonasLoaded, selectedPersonaIds, generatePaletteForPersonaCount]); // urlState intentionally excluded

  // Event-driven conversation state
  const [conversationState, setConversationState] = useState<
    'user-input' | 'director-thinking' | 'persona-streaming' | 'conversation-complete'
  >('user-input');
  const [activeSpeakerId, setActiveSpeakerId] = useState<PersonaId | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle user scroll interaction
  const handleScroll = () => {
    if (!cardRef.current) return;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set user scrolling to true
    setUserScrolling(true);

    // Calculate scroll position to detect if user is near bottom
    const { scrollTop, scrollHeight, clientHeight } = cardRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // If user is already near bottom, don't block auto-scrolling
    if (isNearBottom) {
      setUserScrolling(false);
      return;
    }

    // Reset after 1.5 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setUserScrolling(false);
    }, 1500);
  };

  // Scroll to bottom if not user scrolling
  const scrollToBottom = useCallback(() => {
    if (!userScrolling && messagesEndRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: window.innerWidth < 640 ? "auto" : "smooth", // Use auto on smaller screens for performance
          block: "end" 
        });
      });
    }
  }, [userScrolling]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [scrollTimeoutRef]);

  // Helper function to notify other components when palette changes
  const notifyPaletteUpdate = () => {
    // Trigger a custom storage event since same-tab sessionStorage updates don't trigger storage events
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'mastermind-palette',
      newValue: sessionStorage.getItem('mastermind-palette'),
      storageArea: sessionStorage
    }));
  };

  // Load palette from sessionStorage on mount
  useEffect(() => {
    console.log('[mastermind] 🎨 Palette loading useEffect TRIGGERED - (should only run ONCE)');
    
    const loadPaletteFromStorage = () => {
      try {
        const storedPalette = sessionStorage.getItem('mastermind-palette');
        if (storedPalette) {
          const paletteData: MastermindPaletteData = JSON.parse(storedPalette);
          setCurrentPalette(paletteData);
          console.log('[mastermind]: ✅ Loaded palette from storage:', paletteData.palette.length, 'colors - should not repeat');
          return; // Exit early if palette loaded successfully
        }
      } catch (error) {
        console.warn('[mastermind]: Error loading palette from storage:', error);
      }
      
      // Only generate if no valid stored palette found
      console.log('[mastermind]: No stored palette found, will generate via persona-based useEffect');
    };

    loadPaletteFromStorage();
  }, []); // REMOVED CIRCULAR DEPENDENCIES - only runs once on mount

  // Listen for palette updates from the palette generator page
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'palette-updated') {
        setCurrentPalette(event.data.palette);
        console.log('[mastermind]: Palette updated from generator');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /**
   * Handles form submission for sending messages to the Mastermind Alliance.
   * This is the core functionality that:
   * 1. Validates input and selected personas
   * 2. Sends the user message to the API
   * 3. Establishes SSE connection for streaming responses
   * 4. Manages message state during streaming
   * 5. Handles error conditions and connection cleanup
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate submission requirements
    if (!input.trim() || isLoading || selectedPersonaIds.length === 0) {
      console.log("[Form Debug] Submission blocked:", { 
        emptyInput: !input.trim(), 
        isLoading,
        noPersonas: selectedPersonaIds.length === 0 
      });
      return;
    }

    try {
      // Prepare request payload
      const body = {
        sessionId,
        message: {
          content: input
        },
        modelName,
        selectedPersonas: selectedPersonaIds
      };

      // Initialize API request
      const response = await fetch('/api/mastermind-sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Extract and validate session ID
      const { sessionId: newSessionId } = await response.json();
      if (!newSessionId) {
        throw new Error('No session ID received');
      }

      setSessionId(newSessionId);
      setShowWelcome(false);

      // Establish SSE connection for streaming responses
      if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
        const eventSource = new EventSource(`/api/mastermind-sse?sessionId=${newSessionId}`);
        eventSourceRef.current = eventSource;

        // Add user message immediately to UI
        const userMessage: MastermindMessage = { 
          id: generateMastermindMessageId(),
          role: "user",
          content: input, 
          personaId: "user" as PersonaId,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMessage]);
        scrollToBottom();
        
        // Reset input and set conversation state
        setIsLoading(true);
        setInput("");
        setError(null);
        setConversationState('director-thinking');
        setActiveSpeakerId(null);

        // Handle start events
        eventSource.addEventListener('start', (event) => {
          if (!event.data) {
            console.warn("[SSE WARNING] No data in start event");
            return;
          }
          try {
            const data = JSON.parse(event.data);
            console.log("[SSE DEBUG] Received 'start' event:", data);
            
            // Add both director message and persona placeholder in one update
            setMessages(prev => {
              const newMessages = [...prev];
                
                // Add director's reasoning as a debug message if available
                if (data.directorInsight) {
                  const directorMessage: MastermindMessage = {
                    id: generateMastermindMessageId(),
                    role: "director",
                    content: [
                      "🎬 Director's Decision:",
                      "",
                      `Significance: ${data.directorInsight.significance}`,
                      "",
                      `Opportunities: ${data.directorInsight.opportunities ? data.directorInsight.opportunities.join(", ") : "Evaluating..."}`,
                      "",
                      `Selected: ${data.personaId in personasRegistry ? personasRegistry[data.personaId as PersonaId].name : data.personaId}`,
                      "",
                      `Rationale: ${data.directorInsight.rationale}`,
                      "",
                      `Goal: ${data.directorInsight.goal}`,
                      "",
                      `Direction: ${data.directorInsight.direction}`,
                      "",
                      `Reasoning: ${data.directorInsight.reasoning}`,
                    ].join("\n"),
                    personaId: "director",
                    timestamp: Date.now(),
                    isDebug: true
                  };
                  newMessages.push(directorMessage);
                  console.log("[Director Debug] Added decision message:", directorMessage.id);
                }
                
                // Add persona streaming placeholder
                const personaMessage: MastermindMessage = {
                  id: generateMastermindMessageId(),
                  role: "assistant",
                  content: "",
                  personaId: data.personaId,
                  timestamp: Date.now() + 1, // Ensure it comes after director message
                  isStreaming: true
                };
                newMessages.push(personaMessage);
                
                return newMessages;
              });
              
              scrollToBottom();
            } catch (err) {
              console.error("[SSE Debug] Failed to parse start event", err, event.data);
            }
        });

        // Handle chunk events
        eventSource.addEventListener('chunk', (event) => {
          if (!event.data) {
            console.warn("[SSE WARNING] No data in chunk event");
            return;
          }
          try {
            const data = JSON.parse(event.data);
            console.log("[SSE DEBUG] Received 'chunk' event:", data.personaId, "chunk size:", data.content?.length);
            
            // Update the streaming message content
            setMessages(prev => {
              const messageIndex = prev.findIndex(msg => 
                msg.personaId === data.personaId && msg.isStreaming
              );

              if (messageIndex === -1) {
                console.warn(`[Streaming] No streaming message found for persona ${data.personaId}`);
                return prev;
              }

              const newMessages = [...prev];
              const chunk = data.content || "";
              
              // Debug empty chunks
              if (chunk.length === 0) {
                console.warn(`[Streaming] Empty chunk received for ${data.personaId}`);
              }
              
              newMessages[messageIndex] = {
                ...newMessages[messageIndex],
                content: newMessages[messageIndex].content + chunk
              };

              return newMessages;
            });
            scrollToBottom();
          } catch (err) {
            console.error("[SSE Debug] Failed to parse chunk event", err, event.data);
          }
        });

        // Handle end events
        eventSource.addEventListener('end', (event) => {
          if (!event.data) {
            console.warn("[SSE WARNING] No data in end event");
            return;
          }
          try {
            const data = JSON.parse(event.data);
            console.log("[SSE DEBUG] Received 'end' event:", data.personaId);
            
            // Persona finished speaking - update streaming status and validate content
            setMessages(prev => {
              const messageIndex = prev.findIndex(msg => 
                msg.personaId === data.personaId && msg.isStreaming
              );

              if (messageIndex === -1) return prev;

              const newMessages = [...prev];
              const currentMessage = newMessages[messageIndex];
              
              // Validate content completeness if server provided final content
              if (data.response?.content) {
                const currentLength = currentMessage.content.length;
                const expectedContent = data.response.content;
                
                if (currentMessage.content !== expectedContent) {
                  console.warn(`[Content Validation] Content mismatch for ${data.personaId}`);
                  console.warn(`[Content Recovery] Current: "${currentMessage.content}"`);
                  console.warn(`[Content Recovery] Expected: "${expectedContent}"`);
                  
                  // Use the final content from server as authoritative source
                  currentMessage.content = expectedContent;
                  console.log(`[Content Recovery] ✅ Restored complete content for ${data.personaId}`);
                } else {
                  console.log(`[Content Validation] ✅ Content matches for ${data.personaId}: ${currentLength} chars`);
                }
              }
              
              newMessages[messageIndex] = {
                ...currentMessage,
                isStreaming: false,
                timestamp: Date.now()
              };

              return newMessages;
            });
            
            // Back to director thinking state
            setConversationState('director-thinking');
            setActiveSpeakerId(null);
            scrollToBottom();
          } catch (err) {
            console.error("[SSE Debug] Failed to parse end event", err, event.data);
          }
        });

        // Handle SSE connection errors
        eventSource.addEventListener('error', (event: Event) => {
          console.error("[SSE Debug] Error event received:", event);
          eventSource.close();
          setIsLoading(false);
          setError("Failed to connect to the server. Please try again.");
          setConversationState('user-input');
          setActiveSpeakerId(null);
        });

        // Handle completion of all persona responses
        eventSource.addEventListener('complete', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.completed) {
              eventSource.close();
              setIsLoading(false);
              setConversationState('user-input');
              setActiveSpeakerId(null);
              scrollToBottom();
            }
          } catch (err) {
            console.error("[SSE Debug] Error parsing complete event:", err);
          }
        });
      } else {
        setError("Your browser doesn't support Server-Sent Events. Please try a different browser.");
      }

    } catch (err) {
      console.error("[Form Debug] Error in form submission:", err);
      setIsLoading(false);
      setError("An error occurred while sending your message. Please try again.");
    }
  }, [input, isLoading, selectedPersonaIds, sessionId, modelName, setSessionId, setShowWelcome, setIsLoading, setError, setInput, setMessages, setConversationState, setActiveSpeakerId, scrollToBottom]);

  const handleNewChat = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setSessionId(null);
    setShowWelcome(true);
    setConversationState('user-input');
    setActiveSpeakerId(null);
  };

  const handlePersonaChange = (personas: PersonaId | PersonaId[]) => {
    const newSelectedPersonas = Array.isArray(personas) ? personas : [personas];
    setSelectedPersonaIds(newSelectedPersonas);
    
    // Update URL state with new personas (but don't trigger palette regeneration cascade)
    const newState: MastermindURLState = {
      ...urlState,
      personas: newSelectedPersonas,
      amount: Math.max(3, newSelectedPersonas.length + 1)
    };
    setUrlState(newState);
    updateBrowserURL(newState);
    
    // Note: Palette regeneration will be handled by the useEffect that watches selectedPersonaIds
    // This prevents circular dependencies and cascading updates
    console.log(`[mastermind]: Persona change will trigger palette check via useEffect`);
  };

  // Get color for a specific persona or user
  const getColorForEntity = (entityType: 'user' | 'persona', personaId?: PersonaId) => {
    // Return undefined during SSR to prevent hydration mismatches
    if (!isHydrated || !currentPalette) {
      return undefined;
    }
    
    if (entityType === 'user') {
      // Always use the first color (darkest) for user
      const color = currentPalette.palette[0];
      return color;
    } else if (entityType === 'persona' && personaId) {
      // Assign personas to middle colors (palette[1] through palette[N-1])
      const personaIndex = selectedPersonaIds.indexOf(personaId);
      if (personaIndex >= 0 && personaIndex < currentPalette.palette.length - 1) {
        const color = currentPalette.palette[personaIndex + 1]; // +1 to skip user dark color
        return color;
      }
    }
    
    return undefined;
  };

  // Get optimal text color based on contrast mode and background
  const getTextColor = (backgroundColor: string) => {
    if (!currentPalette) {
      try {
        const lightness = extractLightness(backgroundColor);
        return lightness > 0.5 ? '#000000' : '#ffffff';
      } catch {
        return '#ffffff';
      }
    }

    const contrastMode = currentPalette.textContrastMode || 'normal';
    
    if (contrastMode === 'normal') {
      // Use palette-based harmonious text coloring
      return findNormalContrastTextColor(backgroundColor, currentPalette.palette);
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

  // Generate CSS custom properties for farbvelo theming
  const getThemeVars = () => {
    if (!isHydrated || !currentPalette?.palette) return {};
    return createColorThemeVars(currentPalette.palette);
  };

  const handleModelChange = (model: ModelId) => {
    setModelName(model);
  };

  const handleStop = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Update all streaming messages to non-streaming
    setMessages(prev => prev.map(msg => 
      msg.isStreaming ? { ...msg, isStreaming: false } : msg
    ));
    
    setIsLoading(false);
    setConversationState('user-input');
    setActiveSpeakerId(null);
  };



  // Handle a welcome card click
  const handleToolCardClick = useCallback((content: string) => {
    setInput(content);
    setShowWelcome(false);
    
    // Use a ref to avoid dependency on handleSubmit
    setTimeout(() => {
      const form = document.querySelector('form[data-mastermind-form]') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 0);
  }, []); // Remove all dependencies to make this function stable

  // Memoize the palette and textContrastMode to prevent unnecessary re-renders
  const memoizedPalette = useMemo(() => currentPalette?.palette, [currentPalette?.palette]);
  const memoizedTextContrastMode = useMemo(() => currentPalette?.textContrastMode || 'high', [currentPalette?.textContrastMode]);

  // Memoize the Welcome UI Component to prevent recreation on every render
  const WelcomeUI = useMemo(() => (
    <div className="flex flex-col items-center justify-center h-full w-full" suppressHydrationWarning>
      <div className="max-w-full sm:max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full">
        <pre className="text-xs sm:text-sm font-mono mb-4 text-center">{asciiArt.whale}</pre>
        
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center">Mastermind Alliance</h1>
        
        <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 text-center px-2">Lead a roundtable council of AI personas focused on you</p>
        
      </div>
      
      {isHydrated && (
        <ConversationStarterCards 
          onCardClick={handleToolCardClick}
          className="w-full"
          palette={memoizedPalette}
          textContrastMode={memoizedTextContrastMode}
        />
      )}
    </div>
  ), [isHydrated, handleToolCardClick, memoizedPalette, memoizedTextContrastMode]);

  // Load Inter font dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      
      // Force style update
      document.documentElement.style.setProperty('--mastermind-font', "'Inter', -apple-system, BlinkMacSystemFont, sans-serif");
    }
  }, []);

  // Don't render until personas are loaded
  if (!isPersonasLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col h-screen mastermind-inter-font",
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
      {isHydrated && showBackground && currentPalette?.palette && (
        <div 
          className="fixed inset-0 opacity-30 scale-125 transition-all duration-300 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, var(--gradient-soft))`,
            zIndex: -1
          }}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto relative z-10 pb-32">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4">
            <span className="block">{error}</span>
          </div>
        )}
        
        {showWelcome ? (
          WelcomeUI
        ) : (
          <div 
            ref={cardRef}
            className="flex-1 overflow-auto px-4 py-6"
            onScroll={handleScroll}
          >
            <div className="max-w-4xl mx-auto">
              {/* Render conversation messages in vertical layout like the mockup */}
              {messages.filter(msg => !msg.isDebug).map((message, index) => {
                const nextMessage = messages[index + 1];
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
                      "relative overflow-hidden min-h-[120px] w-full group"
                    )}
                    style={{
                      backgroundColor: backgroundColor,
                      '--message-color': baseColor || 'hsl(var(--muted))',
                      '--message-next-color': nextColor || baseColor || 'hsl(var(--muted))',
                    } as React.CSSProperties}
                  >
                    {showGlow && (
                      <div className="absolute inset-0 mastermind-message-glow pointer-events-none" />
                    )}
                    {colorBleed && nextColor && (
                      <div className="absolute inset-0 mastermind-message-bleed pointer-events-none" />
                    )}

                    {/* Gradient overlay like in mockup */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/15" />

                    {/* Avatar positioned in upper corner */}
                    {!isUser && (
                      <div className="absolute top-4 left-4 z-10 flex flex-col items-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden mb-1">
                          <Image
                            src={`/avatars/${message.personaId}.png`}
                            alt={persona?.name || message.personaId}
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div
                          className="text-xs leading-tight text-center w-16 sm:w-20"
                          style={{
                            color: textColor,
                            fontWeight: 900,
                            fontSize: 'clamp(0.6rem, 1.8vw, 0.75rem)'
                          }}
                        >
                          {persona?.name || message.personaId}
                        </div>
                      </div>
                    )}

                    {isUser && (
                      <div className="absolute top-4 right-4 z-10 flex flex-col items-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden mb-1">
                          <Image
                            src="/avatars/user.png"
                            alt="You"
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div
                          className="text-xs leading-tight text-center w-16 sm:w-20"
                          style={{
                            color: textColor,
                            fontWeight: 900,
                            fontSize: 'clamp(0.6rem, 1.8vw, 0.75rem)'
                          }}
                        >
                          You
                        </div>
                      </div>
                    )}

                    {/* Message content with text wrapping around avatar */}
                    <div className="relative z-0 p-4 w-full flex justify-between items-start">
                      <div
                        className={cn(
                          "text-sm leading-relaxed whitespace-pre-wrap flex-1",
                          isUser ? "text-right" : "text-left"
                        )}
                        style={{
                          color: textColor,
                          marginLeft: !isUser ? 'clamp(80px, 20vw, 96px)' : '0',
                          marginRight: isUser ? 'clamp(80px, 20vw, 96px)' : '0',
                          paddingTop: '0'
                        }}
                      >
                        {/* Text that wraps around avatar */}
                        <span style={{
                          float: !isUser ? 'left' : 'right',
                          width: 'clamp(80px, 20vw, 96px)',
                          height: '90px',
                          marginLeft: !isUser ? 'clamp(-80px, -20vw, -96px)' : '0',
                          marginRight: isUser ? 'clamp(-80px, -20vw, -96px)' : '0'
                        }} />
                        {message.content}
                        {message.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pl-4" style={{ color: textColor }}>
                        <CopyButton content={message.content} variant="subtle" />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Loading/status indicators */}
              {conversationState === 'director-thinking' && isLoading && (
                <div className="flex justify-center">
                  <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                    <span>Director thinking</span>
                    <span className="animate-pulse">...</span>
                  </div>
                </div>
              )}
              
              {conversationState === 'persona-streaming' && activeSpeakerId && (
                <div className="flex justify-center">
                  <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                    <span>{personasRegistry[activeSpeakerId]?.name || activeSpeakerId} is responding</span>
                    <span className="animate-pulse">...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      
      {/* Chat Controls - Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-transparent backdrop-blur-sm border-t border-border/20 shadow-lg">
        <div className="p-4">
          {isHydrated ? (
            <ChatControls
              modelName={modelName}
              messages={messages
                .filter(msg => msg.role !== "director")
                .map(msg => ({
                  id: msg.id,
                  role: msg.role as "user" | "assistant",
                  content: msg.content,
                  timestamp: msg.timestamp,
                  personaId: msg.personaId,
                  isStreaming: msg.isStreaming
                }))}
              allMessages={messages.map(msg => ({
                id: msg.id,
                role: msg.role as "user" | "assistant" | "director",
                content: msg.content,
                timestamp: msg.timestamp,
                personaId: msg.personaId,
                isStreaming: msg.isStreaming,
                isDebug: msg.isDebug
              }))}
              onModelChange={handleModelChange}
              personaId={selectedPersonaIds}
              onPersonaChange={handlePersonaChange}
              input={input}
              onInputChange={setInput}
              isStreaming={isLoading}
              onSubmit={handleSubmit}
              onNewChat={handleNewChat}
              onStop={handleStop}
              multiSelect={true}
              disabled={selectedPersonaIds.length === 0}
              pageName="Mastermind Alliance"
            />
          ) : (
            <div className="h-16" />
          )}
        </div>
      </div>
    </div>
  );
}
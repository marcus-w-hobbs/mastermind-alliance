"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ConversationStarterCards } from "@/components/ui/conversation-starter-cards";
import { CopyButton } from "@/components/ui/copy-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ModelId, DEFAULT_MODEL_ID } from "@/lib/models";
import { cn } from "@/lib/utils";
import { ChatControls } from "@/components/ui/chat-controls";
import { asciiArt } from "@/lib/ascii-art";
import { createColorThemeVars, findNormalContrastTextColor, extractLightness } from "@/lib/color-generation/utils/colorUtils";
import "../safe-area.css"
import "../mastermind/farbvelo-effects.css"

interface BackroomsMessage {
  id: string;
  role: "assistant";
  content: string;
  agent: "AGENT 1" | "AGENT 2";
  timestamp: number;
  isStreaming?: boolean;
  messageId?: string;
}

/**
 * Welcome screen component shown when no conversation is active
 */
function WelcomeScreen({ 
  onSelectTopic, 
  palette, 
  textContrastMode 
}: { 
  onSelectTopic: (topic: string) => void;
  palette?: string[];
  textContrastMode?: 'normal' | 'high';
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="max-w-full sm:max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full">
        <pre className="text-xs sm:text-sm font-mono mb-4 text-center text-green-700">{asciiArt.strangeLoop}</pre>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-center">Backrooms</h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 text-center px-2">Two AI Agents interact with each other on your topic</p>
      </div>
      
      <ConversationStarterCards 
        onCardClick={onSelectTopic}
        className="w-full"
        palette={palette}
        textContrastMode={textContrastMode || 'normal'}
      />
    </div>
  );
}

/**
 * The main page for Backrooms two-agent conversation
 */
export default function BackroomsPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<BackroomsMessage[]>([]);
  const [topic, setTopic] = useState("");
  const [modelName, setModelName] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [isStreaming, setIsStreaming] = useState(false);
  const increments = 5; // how many turns to fetch at once
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Palette and visual effects state
  const [currentPalette, setCurrentPalette] = useState<string[]>([]);
  const [showBackground, setShowBackground] = useState(true);
  const [showGlow, setShowGlow] = useState(true);
  const [colorBleed, setColorBleed] = useState(true);

  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load palette from sessionStorage on mount
  useEffect(() => {
    const loadPalette = () => {
      try {
        const storedPalette = sessionStorage.getItem('mastermind-palette');
        if (storedPalette) {
          const paletteData = JSON.parse(storedPalette);
          setCurrentPalette(paletteData.palette || []);
          setShowBackground(paletteData.showBackground !== false);
          setShowGlow(paletteData.showGlow !== false);
          setColorBleed(paletteData.colorBleed !== false);
        }
      } catch (error) {
        console.warn('[backrooms]: Failed to load palette:', error);
      }
    };

    loadPalette();

    // Listen for palette updates from other pages
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mastermind-palette') {
        loadPalette();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Color assignment functions
  const getColorForAgent = (agent: "AGENT 1" | "AGENT 2") => {
    if (!currentPalette || currentPalette.length === 0) {
      return undefined;
    }
    
    if (agent === "AGENT 1") {
      // Agent 1 uses first color (like user messages)
      return currentPalette[0];
    } else {
      // Agent 2 keeps current styling (no palette color)
      return undefined;
    }
  };

  const getTextColor = (backgroundColor: string) => {
    if (!currentPalette || currentPalette.length === 0) {
      try {
        const lightness = extractLightness(backgroundColor);
        return lightness > 0.5 ? '#000000' : '#ffffff';
      } catch {
        return '#ffffff';
      }
    }

    // Use palette-based harmonious text coloring
    return findNormalContrastTextColor(backgroundColor, currentPalette);
  };


  // Handle user scrolling
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

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);


  // Memoize the palette to prevent unnecessary re-renders
  const memoizedPalette = useMemo(() => currentPalette, [currentPalette]);

  // Generate CSS custom properties for gradients
  const gradientVars = currentPalette.length > 0 ? createColorThemeVars(currentPalette) : {};

  // Stream next N increments of conversation
  const fetchTurns = useCallback(async (numTurns: number) => {
    if (!sessionId) return;
    if (isStreaming) return;

    setIsStreaming(true);

    // close any existing SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(
      `/api/backrooms-sse?sessionId=${sessionId}&increments=${numTurns}`
    );
    eventSourceRef.current = es;

    // Setup streaming events
    es.addEventListener("message", (evt: MessageEvent) => {
      if (!evt.data) return;
      try {
        const data = JSON.parse(evt.data);
        if (!data.agent) return;
        // find existing streaming message or create new
        const { agent, chunk, done, messageId } = data;
        setMessages((prev) => {
          const updated = [...prev];
          const msgIndex = updated.findIndex((m) => m.messageId === messageId);
          if (msgIndex === -1) {
            // create new
            updated.push({
              id: Math.random().toString(36).substring(2),
              role: "assistant",
              content: chunk || "",
              agent,
              timestamp: Date.now(),
              isStreaming: !done,
              messageId,
            });
          } else {
            // update existing
            const existing = updated[msgIndex];
            updated[msgIndex] = {
              ...existing,
              content: existing.content + (chunk || ""),
              isStreaming: !done,
            };
          }
          return updated;
        });
        scrollToBottom();
      } catch {
        // ignore parse errors for partial SSE
      }
    });

    es.addEventListener("complete", () => {
      // done with these increments
      setIsStreaming(false);
      es.close();
      eventSourceRef.current = null;
      setShowContinueDialog(true);
    });

    es.addEventListener("error", (evt) => {
      console.error("[backrooms]: SSE Error", evt);
      setIsStreaming(false);
      es.close();
      eventSourceRef.current = null;
      // Check if this is a CORS/404 error
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setError("API endpoint not accessible. Please ensure you're running the app locally or that the API is deployed to the same domain.");
      } else {
        setError("An error occurred while streaming. Please try again.");
      }
    });
  }, [sessionId, isStreaming, scrollToBottom]);

  // Start a new backrooms conversation with a specific topic
  const handleNewConversationWithTopic = useCallback(async (topicToUse: string) => {
    if (!topicToUse.trim()) {
      setError("Please provide a topic for the backrooms conversation.");
      return;
    }
    setError(null);
    setMessages([]);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    try {
      const response = await fetch("/api/backrooms-sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: null, topic: topicToUse, modelName }),
      });
      if (!response.ok) {
        if (response.status === 404 && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          throw new Error("API endpoint not found. Please ensure you're running the app locally or that the API is deployed to the same domain.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSessionId(data.sessionId);
      // now stream the conversation for the first 5 turns
      await fetchTurns(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [modelName, fetchTurns]);

  // Select a topic from the welcome screen
  const handleSelectTopic = useCallback((selectedTopic: string) => {
    setTopic(selectedTopic);
    // Call handleNewConversation directly with the selected topic
    handleNewConversationWithTopic(selectedTopic);
  }, [handleNewConversationWithTopic]);

  // Start a new backrooms conversation with the current topic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNewConversation = async () => {
    await handleNewConversationWithTopic(topic);
  };

  // Continue another 5 increments
  const handleContinue = async () => {
    setShowContinueDialog(false);
    await fetchTurns(increments);
  };

  // Stop streaming mid-turn
  const handleStop = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setShowContinueDialog(false);
  };

  // Start new conversation entirely
  const handleNewChat = () => {
    handleStop();
    setSessionId(null);
    setMessages([]);
    setTopic("");
    setError(null);
  };
  
  // Submit via ChatControls "Send" button
  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim() || isStreaming) return
    await handleNewConversationWithTopic(topic)
    setTopic("")                       // clear text field after start
  }

  // Display error message if there is one
  useEffect(() => {
    if (error) {
      console.error("Backrooms error:", error);
    }
  }, [error]);

  return (
    <div 
      className={cn(
        "flex flex-col h-screen container mx-auto",
        showBackground && "mastermind-has-background",
        showGlow && "mastermind-has-glow",
        colorBleed && "mastermind-has-bleed"
      )}
      style={gradientVars}
    >
      <div
        ref={cardRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-auto bg-transparent pb-32",
          messages.length === 0 ? "flex items-center justify-center p-0" : "p-3 sm:p-4"
        )}
      >
        {messages.length === 0 ? (
         <WelcomeScreen 
           onSelectTopic={handleSelectTopic} 
           palette={memoizedPalette}
           textContrastMode="normal"
         />
       ) : (
        <div className="space-y-3 sm:space-y-4 mx-auto max-w-full md:max-w-3xl lg:max-w-4xl">
          {messages
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((message, index) => {
              // Get colors for Agent 1 messages (styled like user messages)
              const baseColor = message.agent === "AGENT 1" ? getColorForAgent("AGENT 1") : undefined;
              const backgroundColor = baseColor ? `${baseColor}CC` : (message.agent === "AGENT 1" ? 'hsl(var(--primary))' : '#000000'); // 80% opacity for Agent 1
              const textColor = baseColor ? `${getTextColor(baseColor)}CC` : (message.agent === "AGENT 1" ? 'hsl(var(--primary-foreground))' : '#22c55e'); // 80% opacity for Agent 1

              // Get next message color for bleed effect
              const nextMessage = messages[index + 1];
              const nextBaseColor = nextMessage?.agent === "AGENT 1" ? getColorForAgent("AGENT 1") : undefined;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 sm:gap-3 mx-4 group",
                    message.agent === "AGENT 1" ? "flex-row-reverse justify-end" : "flex-row justify-start"
                  )}
                >
                  {message.agent === "AGENT 1" ? (
                    <Avatar className="size-12 sm:size-16">
                      <Image
                        src="/avatars/ai3.png"
                        alt="Agent 1"
                        width={64}
                        height={64}
                        className="aspect-square size-full"
                        priority
                      />
                      <AvatarFallback>A1</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="size-12 sm:size-16 bg-black">
                      <Image
                        src="/avatars/ai.png"
                        alt="Agent 2"
                        width={64}
                        height={64}
                        className="aspect-square size-full"
                        priority
                      />
                      <AvatarFallback>A2</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2",
                        message.agent === "AGENT 1"
                          ? "rounded-tr-none max-w-[calc(100%-4rem)] sm:max-w-[80%] mastermind-chat-button" // User-style message with responsive width
                          : "max-w-[calc(100%-4rem)] sm:max-w-[80%] md:max-w-none lg:max-w-[95%]", // Agent 2 terminal style
                        showGlow && message.agent === "AGENT 1" && "mastermind-message-glow",
                        colorBleed && nextBaseColor && message.agent === "AGENT 1" && "mastermind-message-bleed"
                      )}
                      style={message.agent === "AGENT 1" ? {
                        backgroundColor: backgroundColor,
                        color: textColor,
                        '--message-color': baseColor || 'hsl(var(--primary))',
                        '--message-next-color': nextBaseColor || baseColor || 'hsl(var(--primary))',
                      } as React.CSSProperties : {
                        backgroundColor: '#000000',
                        color: '#22c55e',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                      }}
                    >
                      <div
                        className={cn(
                          "whitespace-pre-wrap break-words max-w-full",
                          message.agent === "AGENT 1"
                            ? "font-sans" // Proportional font for Agent 1
                            : "font-mono md:max-w-[120ch] sm:text-sm md:text-base leading-relaxed sm:leading-relaxed overflow-x-auto sm:overflow-x-visible" // Fixed-width font with 120 char width on desktop for Agent 2
                        )}
                      >
                        {message.content}
                        {message.isStreaming && (
                          <span className="ml-1 animate-pulse">▌</span>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2" style={{ color: message.agent === "AGENT 1" ? textColor : '#22c55e' }}>
                      <CopyButton content={message.content} variant="subtle" />
                    </div>
                  </div>
                </div>
              );
            })}
          {/* Spacer to ensure content can scroll above the fixed chat controls */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      )}
    </div>

      {/* Chat Controls - Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-transparent backdrop-blur-sm border-t border-border/20 shadow-lg">
        <div className="p-4">
          <ChatControls
          modelName={modelName}
          messages={messages}
          onModelChange={setModelName}
          personaId={[]}                       // no personas in Backrooms
          onPersonaChange={() => {}}
          input={topic}
          onInputChange={setTopic}
          isStreaming={isStreaming}
          onSubmit={handleTopicSubmit}
          onNewChat={handleNewChat}
          onStop={handleStop}
          multiSelect={false}
          disabled={false}
          placeholder="Enter a topic…"
          showPersonaSelector={false}
          pageName="Backrooms"
          />
        </div>
      </div>

      <AlertDialog open={showContinueDialog} onOpenChange={setShowContinueDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Continue More Turns?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="py-4">
            The agents have completed {increments} more turns. Would you like them
            to continue another {increments} turns?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowContinueDialog(false)}>
              Not Now
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleContinue}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
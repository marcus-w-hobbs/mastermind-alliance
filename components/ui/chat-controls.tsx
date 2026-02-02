"use client"

import { ModelId, getModelCategories, getModelsByCategory } from "@/lib/models"
import { getPersonaCategories, getPersonasByCategory, PersonaId, personasRegistry, getDefaultPersonaId } from '@/lib/personas/personas-registry'
import { Button } from "./button"
import { Textarea } from "./textarea"
import { Card, CardContent } from "./card"
import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog"
import { Plus, Send, Square, Bot, Users, Download, Palette, HelpCircle, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { downloadQuestionBombs, generateQuestionBombs } from "@/app/actions/question-bomb-actions"
import { downloadTruthBombs, generateTruthBombs } from "@/app/actions/truth-bomb-actions"
import { useToast } from "./use-toast"
import { calculateContrastRatio } from '@/lib/color-generation/utils/wcagContrast'
import { PersonaSelectorModal } from './persona-selector-modal'

// Generic message interface that accommodates different message formats
interface GenericMessage {
  id: string;
  role: "user" | "assistant" | "director";
  content: string;
  personaId?: PersonaId | "director";
  agent?: string;
  timestamp: number;
  isStreaming?: boolean;
  messageId?: string;
  isDebug?: boolean;
}

export interface ChatControlsProps {
  modelName: ModelId
  messages: GenericMessage[]           // Use the generic message type
  allMessages?: GenericMessage[]       // Optional: all messages including director for export
  onModelChange: (model: ModelId) => void
  personaId: PersonaId | PersonaId[]
  onPersonaChange: (personas: PersonaId | PersonaId[]) => void
  input: string
  onInputChange: (value: string) => void
  isStreaming: boolean
  onSubmit: (e: React.FormEvent) => void
  onNewChat: () => void
  onStop?: () => void
  multiSelect?: boolean
  disabled?: boolean
  placeholder?: string                  
  showPersonaSelector?: boolean
  pageName?: string                     // Optional: name of the current page/section
}

export function ChatControls({
  modelName,
  messages,
  allMessages,
  onModelChange,
  personaId,
  onPersonaChange,
  input,
  onInputChange,
  isStreaming,
  onSubmit,
  onNewChat,
  onStop,
  multiSelect,
  disabled,
  placeholder = "Ask anything",
  showPersonaSelector = true,
  pageName,
}: ChatControlsProps) {
  const { toast } = useToast()
  const pathname = usePathname()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [modelOpen, setModelOpen] = React.useState(false)
  const [personaOpen, setPersonaOpen] = React.useState(false)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = React.useState(false)
  const [isGeneratingTruths, setIsGeneratingTruths] = React.useState(false)
  const [currentPalette, setCurrentPalette] = React.useState<string[]>([])

  // Load palette from sessionStorage
  React.useEffect(() => {
    const loadPalette = () => {
      try {
        const storedPalette = sessionStorage.getItem('mastermind-palette');
        if (storedPalette) {
          const paletteData = JSON.parse(storedPalette);
          setCurrentPalette(paletteData.palette || []);
        }
      } catch (error) {
        console.warn('[chat-controls]: Failed to load palette:', error);
      }
    };

    loadPalette();

    // Listen for palette updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mastermind-palette') {
        loadPalette();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'palette-updated') {
        setCurrentPalette(event.data.palette.palette || []);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Get optimal text color for the user's color (first palette color)
  const getUserTextColor = (backgroundColor: string): string => {
    const whiteContrast = calculateContrastRatio(backgroundColor, '#ffffff');
    const blackContrast = calculateContrastRatio(backgroundColor, '#000000');
    return whiteContrast > blackContrast ? '#ffffff' : '#000000';
  };

  // Get user color styling for the textbox
  const getUserColorStyles = () => {
    if (currentPalette.length === 0) return {};
    
    const userColor = currentPalette[0]; // First color (darkest) for user
    const textColor = getUserTextColor(userColor);
    
    return {
      backgroundColor: `${userColor}E6`, // 90% opacity
      color: textColor,
      borderColor: userColor,
      // Make sure placeholder is visible with some opacity
      '--placeholder-color': textColor + '80', // 50% opacity
    } as React.CSSProperties;
  };

  const handleNewChat = () => {
    if (textareaRef.current) textareaRef.current.style.height = "40px"
    // Dismiss any open selectors
    setPersonaOpen(false)
    setModelOpen(false)
    onNewChat()
  }

  const handleDownload = () => {
    // Use allMessages if provided (includes director messages), otherwise use filtered messages
    const messagesToExport = allMessages || messages;
    
    // Generate timestamp for both filename and document header
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const readableDate = new Date().toLocaleString();
    
    // Get persona names for header
    const selectedPersonas = Array.isArray(personaId) ? personaId : [personaId];
    const personaNames = selectedPersonas.map(id => {
      if (id === getDefaultPersonaId()) {
        return "Default Assistant";
      }
      return personasRegistry[id]?.name || id;
    }).join(", ");
    
    // Start with a header to avoid YAML parsing issues
    const header = `# ${pageName || 'Mastermind Alliance'} Transcript\n\n**Date:** ${readableDate}\n**Model:** ${modelName}\n**Persona(s):** ${personaNames}\n\n---\n\n`;
    
    const lines = messagesToExport.map((m: GenericMessage) => {
      let name: string;
      
      if (m.role === "user") {
        name = "User";
      } else if (m.role === "director") {
        name = "[Director]";
      } else if (m.personaId && m.personaId !== "director") {
        name = personasRegistry[m.personaId as PersonaId]?.name ?? "Assistant";
      } else {
        name = m.agent ?? "Assistant";
      }
      
      // Format director messages with custom separators and italics
      if (m.role === "director") {
        // Clean up director message formatting
        const content = m.content.replace(/🎬/g, '').replace(/\[Director\]/g, '').trim();
        
        // Split content into lines and format each line
        const formattedLines = content.split('\n').map(line => {
          // Only process non-empty lines
          if (!line.trim()) return '';
          
          // Check if line already has markdown formatting (bold, italic, etc)
          // If it starts with ** for bold labels, handle it specially
          if (line.trim().startsWith('**') && line.includes(':**')) {
            // This is likely a field label like **Selected:** or **Opportunities:**
            // Split on the first colon to separate label from content
            const colonIndex = line.indexOf(':');
            const label = line.substring(0, colonIndex + 1);
            const value = line.substring(colonIndex + 1);
            // Italicize only the value part, keep the label bold
            return `${label}${value.trim() ? ` *${value.trim()}*` : ''}`;
          }
          
          // Check for lines that look like field labels without markdown
          if (line.includes(':') && line.split(':')[0].length < 20) {
            const colonIndex = line.indexOf(':');
            const fieldName = line.substring(0, colonIndex);
            const value = line.substring(colonIndex + 1);
            // Format as bold label with italicized value
            return `*${fieldName}:${value.trim() ? ` ${value.trim()}` : ''}*`;
          }
          
          // For other lines, wrap the entire line in italics
          return `*${line.trim()}*`;
        }).filter(line => line !== '').join('  \n'); // Two spaces before newline for markdown line breaks
        
        // Use ASCII characters for separators to ensure pandoc compatibility
        return `\n================================\n\n**${name}**:\n\n${formattedLines}\n\n================================\n\n`;
      }
      
      // Regular formatting for non-director messages
      return `**${name}**: ${m.content}\n\n`;
    });
    
    // Combine header with conversation
    const fullContent = header + lines.join("");
    
    const blob = new Blob([fullContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mastermind-transcript-${timestamp}.txt`
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePaletteClick = () => {
    // Get current page from URL or pageName
    const currentPath = window.location.pathname;
    const selectedPersonas = Array.isArray(personaId) ? personaId : [personaId];
    
    if (currentPath.includes('/mastermind')) {
      // Mastermind: dynamic color count based on personas
      const requiredColors = Math.max(3, selectedPersonas.length + 1);
      const paletteUrl = `/mastermind/palette?personas=${selectedPersonas.join(',')}&colors=${requiredColors}`;
      window.open(paletteUrl, '_blank');
    } else if (currentPath.includes('/chat')) {
      // Chat: 3 colors (user dark + persona + user light)
      const paletteUrl = `/chat/palette?persona=${selectedPersonas[0]}&colors=3`;
      window.open(paletteUrl, '_blank');
    } else if (currentPath.includes('/tools')) {
      // Tools: 3 colors (user dark + persona + user light)
      const paletteUrl = `/tools/palette?persona=${selectedPersonas[0]}&colors=3`;
      window.open(paletteUrl, '_blank');
    } else {
      // Default: open color palette demo
      window.open('/color-palette-demo', '_blank');
    }
  };

  const handleQuestionBombs = async () => {
    if (isGeneratingQuestions || isStreaming) return;
    
    setIsGeneratingQuestions(true);
    
    try {
      // Use allMessages if available (includes director messages), otherwise use filtered messages
      const messagesToAnalyze = allMessages || messages;
      
      // Generate questions and populate the input field
      const result = await generateQuestionBombs(messagesToAnalyze, pageName);
      
      if (result.success && result.questions.length > 0) {
        // Join all questions with newlines and populate the input field
        const questionsText = result.questions.join('\n');
        onInputChange(questionsText);
        
        // Also download the text file
        const downloadResult = await downloadQuestionBombs(messagesToAnalyze, pageName);
        if (downloadResult.success) {
          const blob = new Blob([downloadResult.content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = downloadResult.filename;
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        toast({
          title: "Question Bombs Generated",
          description: `Generated ${result.questions.length} philosophical questions and populated your input field.`,
        });
      } else {
        toast({
          title: "Failed to Generate Questions",
          description: !result.success ? result.error : "No questions were generated",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating question bombs:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while generating questions.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleTruthBombs = async () => {
    if (isGeneratingTruths || isStreaming) return;
    
    setIsGeneratingTruths(true);
    
    try {
      // Use allMessages if available (includes director messages), otherwise use filtered messages
      const messagesToAnalyze = allMessages || messages;
      
      // Generate truths and populate the input field
      const result = await generateTruthBombs(messagesToAnalyze, pageName);
      
      if (result.success && result.truths.length > 0) {
        // Join all truths with newlines and populate the input field
        const truthsText = result.truths.join('\n');
        onInputChange(truthsText);
        
        // Also download the text file
        const downloadResult = await downloadTruthBombs(messagesToAnalyze, pageName);
        if (downloadResult.success) {
          const blob = new Blob([downloadResult.content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = downloadResult.filename;
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        toast({
          title: "Truth Bombs Generated",
          description: `Generated ${result.truths.length} profound truths and populated your input field.`,
        });
      } else {
        toast({
          title: "Failed to Generate Truths",
          description: !result.success ? result.error : "No truths were generated",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating truth bombs:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while generating truths.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTruths(false);
    }
  };

  const selectedPersonas = Array.isArray(personaId) ? personaId : [personaId]

  const handleSelect = (value: string) => {
    if (multiSelect) {
      const currentValues = Array.isArray(personaId) ? personaId : [personaId]
      const newValues = currentValues.includes(value as PersonaId)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value as PersonaId]
      onPersonaChange(newValues)
    } else {
      onPersonaChange(value as PersonaId)
      setPersonaOpen(false)
    }
  }

  return (
    <div className="w-full mastermind-chat-controls">
      {/* Model Selection Popover */}
      {modelOpen && (
        <Card className="mb-2 border shadow-lg mastermind-dropdown-panel">
          <CardContent className="p-4 max-h-[40vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">Select Model</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setModelOpen(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="space-y-3">
              {getModelCategories().map((category) => (
                <div key={category}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">{category}</h4>
                  <div className="space-y-1">
                    {getModelsByCategory(category).map((model) => (
                      <Button
                        key={model.id}
                        variant={modelName === model.id ? "default" : "ghost"}
                        className="w-full justify-start h-auto p-3"
                        onClick={() => {
                          onModelChange(model.id as ModelId)
                          setModelOpen(false)
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Persona Selection Modal */}
      <PersonaSelectorModal
        open={personaOpen && showPersonaSelector}
        onOpenChange={setPersonaOpen}
        selectedPersonas={selectedPersonas}
        onSelect={handleSelect}
        getDefaultPersonaId={getDefaultPersonaId}
        getPersonaCategories={getPersonaCategories}
        getPersonasByCategory={getPersonasByCategory}
        isMastermind={pathname?.includes('mastermind')}
      />

      {/* Main Chat Input */}
      <form onSubmit={onSubmit} data-mastermind-form={pathname.includes('/mastermind') ? 'true' : undefined}>
        {/* Text Input Area - Full Width */}
        <div className="border border-input rounded-xl bg-transparent p-3 mb-3 mx-auto max-w-4xl mastermind-chat-input">
              <Textarea
                ref={textareaRef}
                id="chat-input"
                name="chat-input"
                className="w-full border-none resize-none min-h-[24px] max-h-[200px] p-2 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg placeholder:opacity-75"
                style={getUserColorStyles()}
                value={isStreaming ? "" : input}
                onChange={(e) => {
                  onInputChange(e.target.value)
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = "auto"
                  t.style.height = Math.min(t.scrollHeight, 200) + "px"
                }}
                disabled={isStreaming || disabled}
                placeholder={placeholder}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    onSubmit(e)
                  }
                }}
              />
        </div>

        {/* Bottom Icon Row */}
        <div className="flex items-center justify-between max-w-4xl mx-auto px-3">
              {/* Left Icons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-lg mastermind-chat-button",
                    isStreaming ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                  )}
                  disabled={isStreaming}
                  onClick={() => {
                    setModelOpen(!modelOpen)
                    if (!modelOpen) setPersonaOpen(false)
                  }}
                  title={`Select Model (${modelName})`}
                >
                  <Bot className="h-4 w-4" />
                </Button>
                
                {showPersonaSelector && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg mastermind-chat-button",
                      isStreaming ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                    )}
                    disabled={isStreaming}
                    onClick={() => {
                      setPersonaOpen(!personaOpen)
                      if (!personaOpen) setModelOpen(false)
                    }}
                    title="Select Personas..."
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                )}

                {pathname === '/mastermind' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg mastermind-chat-button",
                      isStreaming ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                    )}
                    disabled={isStreaming}
                    onClick={handlePaletteClick}
                    title="Customize Color Palette"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                )}

              </div>

              {/* Current Selections Display - Center */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1 justify-center px-4 mastermind-status-display">
                {/* Empty center area - persona info now shown in hover card */}
              </div>

              {/* Right Icons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-lg mastermind-chat-button",
                    (isStreaming || isGeneratingQuestions || messages.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                  )}
                  disabled={isStreaming || isGeneratingQuestions || messages.length === 0}
                  onClick={handleQuestionBombs}
                  title="Generate Question Bombs"
                >
                  {isGeneratingQuestions ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <HelpCircle className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-lg mastermind-chat-button",
                    (isStreaming || isGeneratingTruths || messages.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                  )}
                  disabled={isStreaming || isGeneratingTruths || messages.length === 0}
                  onClick={handleTruthBombs}
                  title="Generate Truth Bombs"
                >
                  {isGeneratingTruths ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-lg mastermind-chat-button",
                    (isStreaming || messages.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                  )}
                  disabled={isStreaming || messages.length === 0}
                  onClick={handleDownload}
                  title="Download Chat"
                >
                  <Download className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg mastermind-chat-button",
                        isStreaming ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                      )}
                      disabled={isStreaming}
                      title="New Chat"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[calc(100vw-2rem)] sm:w-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <p className="text-sm text-muted-foreground">This will clobber the current chat.</p>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleNewChat}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Send/Stop Button */}
                <Button
                  type={isStreaming ? "button" : "submit"}
                  size="icon"
                  disabled={(!isStreaming && (!input.trim() || disabled)) || (isStreaming && !onStop)}
                  className={cn(
                    "h-8 w-8 rounded-lg mastermind-send-button",
                    isStreaming && "animate-pulse"
                  )}
                  onClick={
                    isStreaming && onStop
                      ? (e) => {
                          e.preventDefault()
                          onStop()
                        }
                      : undefined
                  }
                >
                  {isStreaming ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
        </div>
      </form>
    </div>
  )
}
/**
 * PersonaManager - Core persona management for the Mastermind Engine
 * 
 * This class extracts and consolidates all persona-related functionality from the
 * original mastermind implementation, providing a clean, reusable interface for:
 * - Persona response generation with sophisticated retry logic
 * - Roundtable context setup and perspective management
 * - Message history management from multiple perspectives
 * - Response validation and quality assurance
 * - Integration with memory systems and director decisions
 * 
 * Environment-agnostic design allows use across web, CLI, and API contexts.
 */

import { streamText, type LanguageModel } from 'ai';
import { Persona } from '@/lib/personas/persona';
import { PersonaId, personasRegistry } from '@/lib/personas/personas-registry';
import { 
  MastermindMessage, 
  PersonaResponseConfig, 
  DirectorDecision,
 
} from './types';

/**
 * Result of persona response generation
 */
export interface PersonaResponseResult {
  /** Whether response generation was successful */
  success: boolean;
  
  /** The generated response text (if successful) */
  responseText: string;
  
  /** Number of attempts made */
  attempts: number;
  
  /** Time taken to generate response in milliseconds */
  responseTime: number;
  
  /** Whether temperature was adjusted during retries */
  temperatureAdjusted: boolean;
  
  /** Final temperature used */
  finalTemperature: number;
  
  /** Error message if generation failed */
  error?: string;
}

/**
 * Context for setting up roundtable conversations
 */
export interface RoundtableContext {
  /** The persona being initialized */
  targetPersona: Persona;
  
  /** All other personas in the conversation */
  otherPersonas: Persona[];
  
  /** Whether to include response length guidance */
  includeResponseGuidance: boolean;
  
  /** Custom roundtable prompt override */
  customRoundtablePrompt?: string;
  
  /** Additional system prompts to inject */
  additionalPrompts?: string[];
}

/**
 * Configuration for message history perspective management
 */
export interface MessageHistoryConfig {
  /** Include perspective labels (e.g., "Marcus Aurelius:") */
  includePerspectiveLabels: boolean;
  
  /** Maximum number of messages to process for performance */
  maxMessagesToProcess?: number;
  
  /** Whether to log perspective assignment details */
  enableVerboseLogging: boolean;
}

/**
 * Core PersonaManager class for handling all persona-related operations
 */
export class PersonaManager {
  private readonly defaultResponseConfig: Required<PersonaResponseConfig> = {
    maxRetries: 3,
    minResponseLength: 10,
    temperature: 0.7,
    maxTokens: 500,
    useExponentialBackoff: true
  };

  private readonly defaultHistoryConfig: MessageHistoryConfig = {
    includePerspectiveLabels: true,
    maxMessagesToProcess: 100,
    enableVerboseLogging: false
  };

  constructor(
    private readonly responseConfig: PersonaResponseConfig = {},
    private readonly historyConfig: Partial<MessageHistoryConfig> = {}
  ) {
    // Merge provided config with defaults
    this.responseConfig = { ...this.defaultResponseConfig, ...responseConfig };
    this.historyConfig = { ...this.defaultHistoryConfig, ...historyConfig };
  }

  /**
   * Generate a persona response with sophisticated retry logic and validation
   * 
   * Extracted from: app/actions/mastermind-persona-actions.ts (lines 14-68)
   * Features:
   * - Exponential backoff retry mechanism
   * - Progressive temperature adjustment
   * - Comprehensive response validation
   * - Detailed attempt tracking and logging
   */
  async generatePersonaResponseWithRetry(
    persona: Persona,
    model: LanguageModel, // AI model instance
    config: Partial<PersonaResponseConfig> = {},
    modelId?: string // Pass modelId separately for logging
  ): Promise<PersonaResponseResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.responseConfig, ...config };
    const { maxRetries = 3, minResponseLength = 10, useExponentialBackoff = true } = finalConfig;
    
    let attempts = 0;
    let temperatureAdjusted = false;
    let finalTemperature = finalConfig.temperature ?? 0.7;
    
    if (this.historyConfig.enableVerboseLogging) {
      console.log(`🔄 Starting response generation for ${persona.name} (max ${maxRetries} attempts)`);
    }
    
    while (attempts < maxRetries) {
      attempts++;
      
      // Calculate temperature with progressive adjustment on retries
      const currentTemperature = attempts === 1 
        ? (finalConfig.temperature ?? 0.7)
        : (finalConfig.temperature ?? 0.7) + (attempts * 0.05);
      
      if (currentTemperature !== (finalConfig.temperature ?? 0.7)) {
        temperatureAdjusted = true;
        finalTemperature = currentTemperature;
      }
      
      if (this.historyConfig.enableVerboseLogging) {
        console.log(`🔄 Attempt ${attempts}/${maxRetries} for ${persona.name} (temp: ${currentTemperature})`);
      }
      
      try {
        let responseText = "";
        
        // Log the streaming request details
        console.log(`[persona-manager] 🎯 Starting stream for ${persona.name}:`, {
          model: modelId || 'unknown',
          temperature: currentTemperature,
          maxOutputTokens: finalConfig.maxTokens ?? 500,
          messageCount: persona.messages.length,
        });
        
        // Log full messages for debugging
        console.log(`[persona-manager] 📝 Full messages for ${persona.name}:`, 
          JSON.stringify(persona.messages, null, 2)
        );
        
        // Check if this is a reasoning model
        // GPT-5 is a reasoning model with configurable reasoning_effort
        const isReasoningModel = modelId === 'gpt-5' || 
                                 modelId === 'gpt-5-mini' || 
                                 modelId === 'gpt-5-nano' ||
                                 modelId?.includes('o1') || 
                                 modelId?.includes('o3');
        
        // Add timeout handling for slow models like GPT-5
        const isSlowModel = modelId === 'gpt-5';
        const timeoutMs = isSlowModel ? 25000 : 15000; // 25s for GPT-5, 15s for others
        
        const streamConfig: Parameters<typeof streamText>[0] = {
          model,
          messages: persona.messages,
          maxOutputTokens: finalConfig.maxTokens ?? 500,
          onFinish: (result) => {
            console.log(`[persona-manager] Stream onFinish for ${persona.name}:`, {
              finishReason: result.finishReason,
              usage: result.usage,
              warnings: result.warnings,
              reasoningTokens: result.usage?.reasoningTokens, // GPT-5 reasoning tokens
            });
          },
        };
        
        // Configure GPT-5 specific options for faster responses
        if (modelId === 'gpt-5' || modelId === 'gpt-5-mini' || modelId === 'gpt-5-nano') {
          streamConfig.providerOptions = {
            openai: {
              reasoningEffort: "low",      // Use "low" for faster responses in conversations
              textVerbosity: "medium",     // Balance between detail and speed
              serviceTier: "flex"          // Use flex tier for better availability
            }
          };
          console.log(`[persona-manager] 🎯 GPT-5 configured with low reasoning effort for speed`);
        }
        
        if (isSlowModel) {
          console.warn(`[persona-manager] ⚠️ Using slow model ${modelId} - timeout set to ${timeoutMs}ms`);
        }
        
        // Only add temperature for non-reasoning models
        if (!isReasoningModel) {
          streamConfig.temperature = currentTemperature;
        } else {
          console.log(`[persona-manager] ⚠️ Skipping temperature for reasoning model ${modelId}`);
        }
        
        const streamResult = streamText(streamConfig);
        
        // Log if there's a warning or error in the result
        if (streamResult.warnings) {
          console.warn(`[persona-manager] ⚠️ Stream warnings for ${persona.name}:`, streamResult.warnings);
        }
        
        // Collect the full response from stream with timeout
        let chunkCount = 0;
        let hasError = false;
        let timedOut = false;
        
        // Create timeout promise
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error(`Stream timeout after ${timeoutMs}ms for model ${modelId}`));
          }, timeoutMs);
        });
        
        try {
          // Race between stream completion and timeout
          await Promise.race([
            (async () => {
              for await (const chunk of streamResult.textStream) {
                if (timedOut) break;
                responseText += chunk;
                chunkCount++;
              }
            })(),
            timeoutPromise
          ]);
        } catch (streamError) {
          hasError = true;
          const errorMsg = streamError instanceof Error ? streamError.message : String(streamError);
          
          if (errorMsg.includes('timeout')) {
            console.error(`[persona-manager] ⏱️ Stream timeout for ${persona.name} using ${modelId}:`, {
              timeoutMs,
              chunkCount,
              partialResponseLength: responseText.length,
              partialResponse: responseText.substring(0, 200) + '...'
            });
            
            // If we got partial response before timeout, use it
            if (responseText.length > 50) {
              console.log(`[persona-manager] ⚠️ Using partial response from timeout (${responseText.length} chars)`);
              hasError = false; // Allow partial response to be used
            }
          } else {
            console.error(`[persona-manager] ❌ Stream iteration error for ${persona.name}:`, {
              error: errorMsg,
              errorType: streamError?.constructor?.name,
              chunkCount,
              partialResponse: responseText.substring(0, 100)
            });
          }
          
          if (hasError) throw streamError;
        }
        
        // Check if stream was empty
        if (!hasError && chunkCount === 0) {
          console.error(`[persona-manager] ❌ Empty stream for ${persona.name} - no chunks received from model ${modelId}`);
          console.error(`[persona-manager] This usually means the model ID is invalid or the API key is missing/incorrect`);
          console.error(`[persona-manager] Model details:`, {
            modelId: modelId || 'unknown',
            temperature: currentTemperature,
            maxTokens: finalConfig.maxTokens ?? 500
          });
          
          // Check the full stream result for any additional info
          try {
            const fullStreamResult = await streamResult.fullStream;
            console.error(`[persona-manager] Stream result details:`, {
              fullStreamResult,
              usage: await streamResult.usage,
              finishReason: await streamResult.finishReason,
              text: await streamResult.text
            });
          } catch (e) {
            console.error(`[persona-manager] Could not get stream result details:`, e);
          }
          
          throw new Error(`Empty response from model ${modelId} - this usually indicates an invalid model ID or missing API credentials`);
        }
        
        console.log(`[persona-manager] ✅ Stream completed for ${persona.name}:`, {
          chunkCount,
          responseLength: responseText.length,
          preview: responseText.substring(0, 100) + '...'
        });
        
        // Comprehensive response validation
        const validationResult = this.validateResponse(responseText, minResponseLength);
        
        if (validationResult.isValid) {
          const responseTime = Date.now() - startTime;
          
          if (this.historyConfig.enableVerboseLogging) {
            console.log(`✅ Valid response received for ${persona.name} on attempt ${attempts} (${validationResult.trimmedLength} chars, ${responseTime}ms)`);
          }
          
          return {
            success: true,
            responseText: validationResult.trimmedResponse,
            attempts,
            responseTime,
            temperatureAdjusted,
            finalTemperature,
          };
        } else {
          if (this.historyConfig.enableVerboseLogging) {
            console.warn(`⚠️ Response inadequate for ${persona.name}: ${validationResult.reason}`);
            console.warn(`Content preview: "${validationResult.trimmedResponse.substring(0, 50)}${validationResult.trimmedResponse.length > 50 ? '...' : ''}"`);
          }
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Always log errors for debugging, especially for specific models
        console.error(`[persona-manager] ❌ Error generating response for ${persona.name} (attempt ${attempts}/${maxRetries}):`, {
          error: errorMessage,
          errorType: error?.constructor?.name,
          errorStack: error instanceof Error ? error.stack : undefined,
          model: modelId || 'unknown',
          temperature: currentTemperature,
          maxTokens: finalConfig.maxTokens ?? 500,
          messageCount: persona.messages.length,
          lastMessage: (() => {
            const lastMsg = persona.messages[persona.messages.length - 1];
            if (lastMsg && typeof lastMsg.content === 'string') {
              return lastMsg.content.substring(0, 100) + '...';
            }
            return 'complex content';
          })()
        });
        
        // Additional detailed error info for AI SDK errors
        if (error && typeof error === 'object' && 'cause' in error) {
          console.error(`[persona-manager] ❌ Error cause:`, error.cause);
        }
        
        if (error && typeof error === 'object' && 'response' in error) {
          console.error(`[persona-manager] ❌ Error response:`, error.response);
        }
      }
      
      // Exponential backoff before retry
      if (attempts < maxRetries && useExponentialBackoff) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        if (this.historyConfig.enableVerboseLogging) {
          console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
        }
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    // All retries failed
    const responseTime = Date.now() - startTime;
    const errorMessage = `All ${attempts} attempts failed for ${persona.name}`;
    
    if (this.historyConfig.enableVerboseLogging) {
      console.error(`❌ ${errorMessage}`);
    }
    
    return {
      success: false,
      responseText: "",
      attempts,
      responseTime,
      temperatureAdjusted,
      finalTemperature,
      error: errorMessage
    };
  }

  /**
   * Validate a persona response for quality and substantive content
   * 
   * Enhanced version of validation logic from original implementation
   */
  private validateResponse(responseText: string, minLength: number) {
    const trimmedResponse = responseText.trim();
    const wordCount = trimmedResponse.split(/\s+/).length;
    
    // Check minimum length
    if (trimmedResponse.length < minLength) {
      return {
        isValid: false,
        reason: `Too short (${trimmedResponse.length} < ${minLength} chars)`,
        trimmedResponse,
        trimmedLength: trimmedResponse.length
      };
    }
    
    // Check for only punctuation/whitespace
    if (trimmedResponse.match(/^[\.\,\!\?\s]*$/)) {
      return {
        isValid: false,
        reason: "Contains only punctuation and whitespace",
        trimmedResponse,
        trimmedLength: trimmedResponse.length
      };
    }
    
    // Check minimum word count
    if (wordCount < 3) {
      return {
        isValid: false,
        reason: `Too few words (${wordCount} < 3)`,
        trimmedResponse,
        trimmedLength: trimmedResponse.length
      };
    }
    
    // Check for repetitive content (simple heuristic)
    const words = trimmedResponse.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    if (repetitionRatio < 0.3 && words.length > 10) {
      return {
        isValid: false,
        reason: `Too repetitive (${Math.round(repetitionRatio * 100)}% unique words)`,
        trimmedResponse,
        trimmedLength: trimmedResponse.length
      };
    }
    
    return {
      isValid: true,
      reason: "Valid response",
      trimmedResponse,
      trimmedLength: trimmedResponse.length
    };
  }

  /**
   * Initialize personas with roundtable context awareness
   * 
   * Extracted from: app/actions/mastermind-actions.ts (lines 225-251)
   * Sets up each persona to be aware of others in the conversation
   */
  initializeRoundtableContext(
    personas: Persona[],
    config: Partial<RoundtableContext> = {}
  ): void {
    if (this.historyConfig.enableVerboseLogging) {
      console.log('🎬 Initializing personas with roundtable context');
    }

    for (let i = 0; i < personas.length; i++) {
      const currentPersona = personas[i];
      const otherPersonas = personas.filter((_, index) => index !== i);
      
      if (this.historyConfig.enableVerboseLogging) {
        console.log(`  👤 Initializing ${currentPersona.name}`);
      }

      // Reset persona messages to clean state
      currentPersona.resetMessages();
      
      // Build roundtable awareness if there are other personas
      const otherPersonaNames = this.formatPersonaNames(otherPersonas);
      if (otherPersonaNames) {
        const roundtablePrompt = config.customRoundtablePrompt || 
          `You are engaged in a roundtable discussion with the user, ${otherPersonaNames}.
           Build upon the conversation adding value from your unique perspective.
           If you respond to a member of the roundtable address them by name.
           Do not break character.`;
        
        currentPersona.addToSystemPrompt(roundtablePrompt);
        
        if (this.historyConfig.enableVerboseLogging) {
          console.log(`    ✅ Added roundtable context with: ${otherPersonaNames}`);
        }
      } else {
        if (this.historyConfig.enableVerboseLogging) {
          console.log("    ⚠️  No other personas found, skipping roundtable context");
        }
      }
      
      // Add response guidance if requested
      if (config.includeResponseGuidance !== false) {
        currentPersona.addToSystemPrompt(
          `Keep your response thoughtful but reasonably concise - aim for 1 short paragraph.`
        );
        if (this.historyConfig.enableVerboseLogging) {
          console.log('    📏 Added response guidance');
        }
      }
      
      // Add any additional prompts
      if (config.additionalPrompts) {
        for (const prompt of config.additionalPrompts) {
          currentPersona.addToSystemPrompt(prompt);
        }
        if (this.historyConfig.enableVerboseLogging) {
          console.log(`    📝 Added ${config.additionalPrompts.length} additional prompts`);
        }
      }
    }
  }

  /**
   * Rebuild message history from each persona's perspective
   * 
   * Extracted from: app/actions/mastermind-actions.ts (lines 286-327)
   * Key feature: Each persona sees their own messages as "assistant" and 
   * others' messages as "user" messages with speaker labels
   */
  rebuildMessageHistoryPerspectives(
    personas: Persona[],
    messages: MastermindMessage[],
    config: Partial<MessageHistoryConfig> = {}
  ): void {
    const finalConfig = { ...this.historyConfig, ...config };
    const startTime = performance.now();
    
    // Limit messages for performance if configured
    const messagesToProcess = finalConfig.maxMessagesToProcess 
      ? messages.slice(-finalConfig.maxMessagesToProcess)
      : messages;
    
    if (finalConfig.enableVerboseLogging) {
      console.log('🏗️  Rebuilding message history for each persona');
      console.log(`  📜 Processing ${messagesToProcess.length} messages (of ${messages.length} total)`);
    }
    
    let messageCount = 0;
    
    for (const msg of messagesToProcess) {
      messageCount++;
      const messageStartTime = performance.now();
      
      if (finalConfig.enableVerboseLogging) {
        console.log(`  📨 Processing message ${messageCount}/${messagesToProcess.length}: ${msg.role} from ${msg.personaId || 'user'}`);
      }
      
      if (msg.role === "assistant" && msg.personaId) {
        // Handle assistant messages from personas
        for (const persona of personas) {
          const personaId = this.getPersonaIdFromInstance(persona);
          
          if (personaId === msg.personaId) {
            // This persona sees their own message as assistant
            persona.addAssistantMessage(msg.content);
            if (finalConfig.enableVerboseLogging) {
              console.log(`    ➡️  ${persona.name} sees own message as assistant`);
            }
          } else {
            // Other personas see it as user message with speaker label
            const speakingPersona = personasRegistry[msg.personaId as PersonaId];
            if (speakingPersona) {
              const messageContent = finalConfig.includePerspectiveLabels
                ? `${speakingPersona.name}: ${msg.content}`
                : msg.content;
              
              persona.addUserMessage(messageContent);
              if (finalConfig.enableVerboseLogging) {
                console.log(`    ➡️  ${persona.name} sees ${speakingPersona.name}'s message as user`);
              }
            }
          }
        }
      } else if (msg.role === "user") {
        // User messages go to all personas as user messages
        for (const persona of personas) {
          persona.addUserMessage(msg.content);
        }
        if (finalConfig.enableVerboseLogging) {
          console.log(`    ➡️  All personas received user message`);
        }
      }
      
      if (finalConfig.enableVerboseLogging) {
        const messageEndTime = performance.now();
        console.log(`    ⏱️  Message processed in ${(messageEndTime - messageStartTime).toFixed(2)}ms`);
      }
    }
    
    const endTime = performance.now();
    if (finalConfig.enableVerboseLogging) {
      console.log(`✅ Message history rebuilt in ${(endTime - startTime).toFixed(2)}ms (${messageCount} messages)`);
    }
  }

  /**
   * Add director guidance to a persona's system prompt temporarily
   * 
   * Extracted from: app/actions/mastermind-actions.ts (lines 420-434)
   * This guidance helps the persona understand their specific role in the current turn
   */
  injectDirectorGuidance(persona: Persona, decision: DirectorDecision): void {
    if (this.historyConfig.enableVerboseLogging) {
      console.log(`💉 Injecting director guidance into ${persona.name}'s prompt`);
    }

    const directorGuidance = `
--- DIRECTOR'S ANALYSIS ---
Current Significance: ${decision.analysis.significance}
Your Mission: ${decision.choreography.direction}
Conversational Goal: ${decision.choreography.conversationalGoal}
Rationale for your selection: ${decision.choreography.rationale}

Please respond thoughtfully to fulfill this mission while staying true to your character.
--- END DIRECTOR'S GUIDANCE ---
`;

    persona.addToSystemPrompt(directorGuidance);
  }

  /**
   * Remove director guidance from persona's system prompt
   * 
   * Extracted from: app/actions/mastermind-actions.ts (lines 572-580)
   * Important for cleanup to prevent guidance accumulation
   */
  cleanupDirectorGuidance(persona: Persona): void {
    if (this.historyConfig.enableVerboseLogging) {
      console.log(`🧹 Cleaning up director guidance from ${persona.name}'s prompt`);
    }

    const systemMessage = persona.messages[0];
    if (systemMessage && typeof systemMessage.content === 'string') {
      const cleanedPrompt = systemMessage.content.replace(
        /--- DIRECTOR'S ANALYSIS ---[\s\S]*?--- END DIRECTOR'S GUIDANCE ---\n?/g, 
        ''
      );
      systemMessage.content = cleanedPrompt;
      
      if (this.historyConfig.enableVerboseLogging) {
        console.log('  ✅ Guidance cleaned');
      }
    }
  }

  /**
   * Update all persona message histories after a new response
   * 
   * Extracted from: app/actions/mastermind-actions.ts (lines 594-615)
   * Maintains perspective consistency across all personas
   */
  updateAllPersonaHistories(
    personas: Persona[],
    responseText: string,
    speakingPersonaId: PersonaId
  ): void {
    const startTime = performance.now();
    
    if (this.historyConfig.enableVerboseLogging) {
      console.log('📝 Updating all persona message histories...');
    }

    for (const persona of personas) {
      const personaId = this.getPersonaIdFromInstance(persona);
      
      if (personaId === speakingPersonaId) {
        // Speaking persona sees their own message as assistant
        persona.addAssistantMessage(responseText);
        if (this.historyConfig.enableVerboseLogging) {
          console.log(`  ➡️  ${persona.name} sees own message as assistant`);
        }
      } else {
        // Other personas see it as user message with speaker name
        const speakingPersona = personasRegistry[speakingPersonaId];
        if (speakingPersona) {
          const messageContent = this.historyConfig.includePerspectiveLabels
            ? `${speakingPersona.name}: ${responseText}`
            : responseText;
          
          persona.addUserMessage(messageContent);
          if (this.historyConfig.enableVerboseLogging) {
            console.log(`  ➡️  ${persona.name} sees ${speakingPersona.name}'s message as user`);
          }
        }
      }
    }
    
    const endTime = performance.now();
    if (this.historyConfig.enableVerboseLogging) {
      console.log(`📝 All persona histories updated in ${(endTime - startTime).toFixed(2)}ms`);
    }
  }

  /**
   * Find a persona by ID from an array of persona instances
   * 
   * Extracted from: app/actions/mastermind-persona-actions.ts (lines 303-313)
   */
  async findPersonaById(personaId: PersonaId, personas: Persona[]): Promise<Persona | null> {
    for (const persona of personas) {
      const registryPersonaId = this.getPersonaIdFromInstance(persona);
      if (registryPersonaId === personaId) {
        return persona;
      }
    }
    return null;
  }

  /**
   * Get persona ID from a persona instance by looking up in registry
   */
  private getPersonaIdFromInstance(persona: Persona): PersonaId | null {
    const entry = Object.entries(personasRegistry)
      .find(([, meta]) => meta.instance === persona);
    return entry ? entry[0] as PersonaId : null;
  }

  /**
   * Format persona names into a readable list, excluding a specific persona
   * 
   * Extracted from: app/actions/mastermind-actions.ts (lines 20-32)
   */
  private formatPersonaNames(personas: Persona[]): string {
    if (personas.length <= 1) {
      return "";
    }
    
    const lastPersona = personas[personas.length - 1].name;
    const otherPersonas = personas.slice(0, personas.length - 1).map(p => p.name);
    
    return `${otherPersonas.join(", ")}, and ${lastPersona}`;
  }

  /**
   * Add memory context to personas if memory system is available
   * 
   * This is a placeholder for memory integration that would be implemented
   * based on the specific memory system being used (Mem0, etc.)
   */
  async addMemoryContext(
    personas: Persona[],
    userQuery: string,
    memorySearchFunction?: (query: string) => Promise<string | null>
  ): Promise<void> {
    if (!memorySearchFunction) {
      return;
    }

    if (this.historyConfig.enableVerboseLogging) {
      console.log('🧠 Adding memory context to personas');
    }

    try {
      const memories = await memorySearchFunction(userQuery);
      if (memories) {
        const memoryPrompt = `Here are some relevant user memories: ${memories}. Use these memories to inform your response.`;
        
        for (const persona of personas) {
          persona.addToSystemPrompt(memoryPrompt);
        }
        
        if (this.historyConfig.enableVerboseLogging) {
          console.log('✅ Memory context added to all personas');
        }
      } else {
        if (this.historyConfig.enableVerboseLogging) {
          console.log('📭 No relevant memories found');
        }
      }
    } catch (error) {
      if (this.historyConfig.enableVerboseLogging) {
        console.error('❌ Error adding memory context:', error);
      }
    }
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): {
    responseConfig: PersonaResponseConfig;
    historyConfig: Partial<MessageHistoryConfig>;
  } {
    return {
      responseConfig: { ...this.responseConfig },
      historyConfig: { ...this.historyConfig }
    };
  }

  /**
   * Create a new PersonaManager with updated configuration
   */
  withConfig(
    responseConfig?: Partial<PersonaResponseConfig>,
    historyConfig?: Partial<MessageHistoryConfig>
  ): PersonaManager {
    return new PersonaManager(
      { ...this.responseConfig, ...responseConfig },
      { ...this.historyConfig, ...historyConfig }
    );
  }
}

/**
 * Default PersonaManager instance with standard configuration
 */
export const defaultPersonaManager = new PersonaManager();

/**
 * Factory function for creating PersonaManager with custom configuration
 */
export function createPersonaManager(
  responseConfig?: PersonaResponseConfig,
  historyConfig?: Partial<MessageHistoryConfig>
): PersonaManager {
  return new PersonaManager(responseConfig, historyConfig);
}

/**
 * Utility function to create a verbose PersonaManager for debugging
 */
export function createVerbosePersonaManager(
  responseConfig?: PersonaResponseConfig
): PersonaManager {
  return new PersonaManager(
    responseConfig,
    { 
      enableVerboseLogging: true,
      includePerspectiveLabels: true
    }
  );
}
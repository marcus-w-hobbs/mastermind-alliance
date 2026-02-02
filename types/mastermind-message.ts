import { PersonaId } from '@/lib/personas/personas-registry';

// Mastermind messages are displayed in the UI as a list of messages
export interface MastermindMessage {
    id: string;
    role: "user" | "assistant" | "director";
    content: string;
    personaId: PersonaId | "director"; // Allow "director" as a special persona ID
    timestamp: number;
    isStreaming?: boolean;
    isDebug?: boolean; // Flag to indicate this is a debug message (not stored in backend)
  }
  
/**
 * Generates a random ID for a message
 */
export function generateMastermindMessageId(): string {
  return Math.random().toString(36).substring(2);
}
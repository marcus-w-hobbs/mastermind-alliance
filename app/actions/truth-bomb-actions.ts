"use server";

import { ModelId, getModelInstance } from "@/lib/models";
import { generateText } from "ai";

const CLAUDE_4_SONNET = "claude-sonnet-4-20250514" as ModelId;
// const GPT_5 = "gpt-5" as ModelId; // Note: GPT-5 has 20-50 second response times
// const GPT_4O = "gpt-4o" as ModelId; // Faster alternative to GPT-5

// Generic message interface that accommodates different message formats
interface GenericMessage {
  id: string;
  role: "user" | "assistant" | "director";
  content: string;
  personaId?: string;
  agent?: string;
  timestamp: number;
  isStreaming?: boolean;
  messageId?: string;
  isDebug?: boolean;
}

// Convert messages to markdown format similar to download function
function messagesToMarkdown(messages: GenericMessage[], pageName?: string): string {
  const readableDate = new Date().toLocaleString();
  
  // Start with a header
  const header = `# ${pageName || 'Conversation'} Truth Bombs\n\n**Date:** ${readableDate}\n\n---\n\n# Original Conversation\n\n`;
  
  const lines = messages.map((m: GenericMessage) => {
    let name: string;
    
    if (m.role === "user") {
      name = "User";
    } else if (m.role === "director") {
      name = "[Director]";
    } else if (m.personaId && m.personaId !== "director") {
      // Try to get persona name from registry if available
      name = m.personaId; // Fallback to ID if registry not available
    } else {
      name = m.agent ?? "Assistant";
    }
    
    // Skip director messages for truth generation (they're debug info)
    if (m.role === "director") {
      return "";
    }
    
    // Regular formatting for non-director messages
    return `**${name}**: ${m.content}\n\n`;
  }).filter(line => line !== "");
  
  // Combine header with conversation
  return header + lines.join("");
}

// The extraction prompt for truth bombs
const getExtractionPrompt = (conversation: string) => `
Extract the most profound truths hidden within this conversation. Transform insights, observations, and revelations into declarative truth statements that stop people in their tracks. Each truth should stand alone as an undeniable recognition of reality.

**WHAT MAKES A POWERFUL TRUTH:**
- Reveals something we all know but never say
- Makes the invisible suddenly visible
- Connects patterns we didn't notice before
- Exposes the mechanics behind the mystery
- Shows what we're really doing when we think we're doing something else
- Cuts through the noise to what actually matters
- Feels both shocking and inevitable

**TRANSFORMATION PATTERNS:**
Observation about behavior → Truth about human nature
Analysis of systems → Truth about power
Discussion of problems → Truth about solutions
Description of change → Truth about constants
Exploration of ideas → Truth about reality

**AVOID:**
- Obvious statements everyone already knows
- Personal opinions disguised as universal truths
- Truths that require context from the conversation
- Academic or overly complex language
- Truths about specific people, places, or events mentioned
- Platitudes or clichés
- Judgmental or preachy statements

**THE FEELING TO CAPTURE:**
- The truth that makes you say "Oh shit, that's exactly right"
- The truth that explains why everything feels the way it feels
- The truth you wish someone had told you years ago
- The truth that makes everything else make sense
- The truth that's been staring you in the face all along

Output ONLY the truth statements, one per line. No explanations, no numbering. Each truth should detonate on contact with a thinking mind. Extract 15-20 truths.

CONVERSATION:
${conversation}
`;

export async function generateTruthBombs(
  messages: GenericMessage[],
  pageName?: string
): Promise<{ success: true; truths: string[] } | { success: false; error: string }> {
  try {
    // Filter out empty or streaming messages
    const validMessages = messages.filter(m => 
      m.content && 
      m.content.trim().length > 0 && 
      !m.isStreaming
    );
    
    if (validMessages.length === 0) {
      return { success: false, error: "No valid messages to analyze" };
    }
    
    // Convert messages to markdown
    const conversation = messagesToMarkdown(validMessages, pageName);
    
    if (!conversation.trim()) {
      return { success: false, error: "Failed to format conversation" };
    }
    
    // Generate truths using AI
    // Options: CLAUDE_4_SONNET (9s), GPT_4O (2-5s), GPT_5 (20-50s)
    const model = getModelInstance(CLAUDE_4_SONNET); // Using Claude for faster responses 
    const result = await generateText({
      model,
      prompt: getExtractionPrompt(conversation),
    });
    
    // Parse truths from result
    const truths = result.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (truths.length === 0) {
      return { success: false, error: "No truths were generated" };
    }
    
    return { success: true, truths };
    
  } catch (error) {
    console.error("Error generating truth bombs:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

export async function downloadTruthBombs(
  messages: GenericMessage[],
  pageName?: string
): Promise<{ success: true; content: string; filename: string } | { success: false; error: string }> {
  const result = await generateTruthBombs(messages, pageName);
  
  if (!result.success) {
    return result;
  }
  
  // Format as plain text file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const readableDate = new Date().toLocaleString();
  
  const content = `Truth Bombs - ${pageName || 'Conversation'}

Generated: ${readableDate}
Source: ${pageName || 'Unknown'}

================================

The Truths That Hit Like Lightning

${result.truths.map((t, index) => `${index + 1}. ${t}`).join('\n\n')}

================================

Generated using Truth Bomb extraction from conversation analysis
`;
  
  const filename = `truth-bombs-${timestamp}.txt`;
  
  return {
    success: true,
    content,
    filename
  };
}
"use server";

import { ModelId, getModelInstance } from "@/lib/models";
import { generateText } from "ai";

const CLAUDE_4_SONNET = "claude-sonnet-4-20250514" as ModelId;

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
  const header = `# ${pageName || 'Conversation'} Question Bombs\n\n**Date:** ${readableDate}\n\n---\n\n# Original Conversation\n\n`;
  
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
    
    // Skip director messages for question generation (they're debug info)
    if (m.role === "director") {
      return "";
    }
    
    // Regular formatting for non-director messages
    return `**${name}**: ${m.content}\n\n`;
  }).filter(line => line !== "");
  
  // Combine header with conversation
  return header + lines.join("");
}

// The extraction prompt (same as original script)
const getExtractionPrompt = (conversation: string) => `
Extract the most profound questions lurking beneath this conversation. Transform insights and tensions into questions that make people stop everything and think. Each question should stand alone as a philosophical provocation.

**WHAT MAKES A POWERFUL QUESTION:**
- Reveals an assumption we didn't know we had
- Creates productive confusion
- Connects two things that seemed unrelated
- Makes the ordinary suddenly strange
- Implies its own impossibility
- Changes how you see everything after reading it
- Feels both urgent and eternal

**TRANSFORMATION PATTERNS:**
Statement about power → Question about agency
Observation about technology → Question about humanity
Analysis of systems → Question about purpose
Description of behavior → Question about choice
Fact about society → Question about possibility

**AVOID:**
- Questions that have obvious answers
- Academic or technical language
- Questions that require context from the conversation
- Rhetorical questions that are really just statements
- Questions about specific people, places, or events mentioned
- "What if" questions that feel like fiction prompts
- Questions that judge rather than explore

**THE FEELING TO CAPTURE:**
- The question that keeps you awake at 3am
- The question a child would ask that adults can't answer
- The question that makes everything else feel less important
- The question that turns your worldview inside out
- The question you're afraid to ask but can't stop thinking about

Output ONLY the questions, one per line. No explanations, no numbering. Each question should detonate on contact with a thinking mind. Extract 15-20 questions.

CONVERSATION:
${conversation}
`;

export async function generateQuestionBombs(
  messages: GenericMessage[],
  pageName?: string
): Promise<{ success: true; questions: string[] } | { success: false; error: string }> {
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
    
    // Generate questions using AI
    const model = getModelInstance(CLAUDE_4_SONNET);
    const result = await generateText({
      model,
      prompt: getExtractionPrompt(conversation),
    });
    
    // Parse questions from result
    const questions = result.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (questions.length === 0) {
      return { success: false, error: "No questions were generated" };
    }
    
    return { success: true, questions };
    
  } catch (error) {
    console.error("Error generating question bombs:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

export async function downloadQuestionBombs(
  messages: GenericMessage[],
  pageName?: string
): Promise<{ success: true; content: string; filename: string } | { success: false; error: string }> {
  const result = await generateQuestionBombs(messages, pageName);
  
  if (!result.success) {
    return result;
  }
  
  // Format as plain text file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const readableDate = new Date().toLocaleString();
  
  const content = `Question Bombs - ${pageName || 'Conversation'}

Generated: ${readableDate}
Source: ${pageName || 'Unknown'}

================================

The Questions That Make You Stop Everything and Think

${result.questions.map((q, index) => `${index + 1}. ${q}`).join('\n\n')}

================================

Generated using Question Bomb extraction from conversation analysis
`;
  
  const filename = `question-bombs-${timestamp}.txt`;
  
  return {
    success: true,
    content,
    filename
  };
}
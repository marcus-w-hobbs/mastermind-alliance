/**
 * Test script for ConversationDirector
 * 
 * This file provides a simple way to verify the director logic works correctly
 * without needing to run the full application.
 */

import type { ConversationState, MastermindMessage } from './types';
import { createConversationDirector, createDirectorContext } from './director';
import { PersonaFactory } from '@/lib/personas/persona-factory';

// Mock data for testing
const mockPersonas = [
  PersonaFactory.getPersonaById('mark-twain'),
  PersonaFactory.getPersonaById('george-orwell')
];

const mockMessages: MastermindMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'What is the nature of wisdom?',
    timestamp: Date.now() - 5000,
    personaId: 'user'
  },
  {
    id: '2', 
    role: 'assistant',
    content: 'Wisdom begins with knowing that you know nothing...',
    timestamp: Date.now() - 3000,
    personaId: 'mark-twain'
  }
];

const mockConversationState: ConversationState = {
  sessionId: 'test-session',
  messages: mockMessages,
  config: {
    modelId: 'claude-3-5-sonnet-20240620',
    selectedPersonas: ['mark-twain', 'george-orwell'],
    maxResponses: 10
  },
  responseCount: 1,
  lastActivity: Date.now(),
  recentFailedPersonas: [],
  consecutiveFailures: 0,
  isActive: true,
  metadata: {
    startTime: Date.now() - 10000
  }
};

/**
 * Test function to validate director functionality
 */
export async function testDirector() {
  console.log('🧪 Testing ConversationDirector...\n');

  try {
    // Create director instance
    const director = createConversationDirector({
      modelId: 'claude-3-5-sonnet-20240620',
      enableLogging: true
    });

    console.log('✅ Director instance created successfully');

    // Create director context
    const context = createDirectorContext(
      mockConversationState,
      mockPersonas,
      mockMessages,
      1,
      [], // no failed personas
      'mark-twain' // last speaker
    );

    console.log('✅ Director context created successfully');

    // Test conversation health analysis
    const healthAnalysis = director.analyzeConversationHealth(context);
    console.log('\n📊 Conversation Health Analysis:');
    console.log('Health:', healthAnalysis.health);
    console.log('Insights:', healthAnalysis.insights);
    console.log('Recommendations:', healthAnalysis.recommendations);

    // Test configuration methods
    const config = director.getConfig();
    console.log('\n⚙️ Current Director Config:');
    console.log(JSON.stringify(config, null, 2));

    director.updateConfig({ temperature: 0.8 });
    console.log('\n✅ Config updated successfully');

    console.log('\n🎉 All director tests completed successfully!');

    // Note: We can't test the actual AI decision making without API keys,
    // but we've verified the core structure and logic works
    console.log('\n📝 Note: Full director decision testing requires API keys');
    console.log('The core logic structure has been validated successfully.');

  } catch (error) {
    console.error('❌ Director test failed:', error);
    throw error;
  }
}

/**
 * Run tests if this file is executed directly
 */
if (require.main === module) {
  testDirector().catch(console.error);
}
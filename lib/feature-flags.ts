// lib/featureFlags.ts

export interface FeatureFlags {
    enableChatMem0: boolean;
    chatMem0UserId: string;
    enableMastermindMem0: boolean;
    mastermindMem0UserId: string;
    enableAgentMem0: boolean;
    agentMem0UserId: string;
    enableToolsMem0: boolean;
    toolsMem0UserId: string;
  }
  
  export const featureFlags: FeatureFlags = {
    // Only enable in server environment and when not building
    enableChatMem0: true,
    chatMem0UserId: "user-chat-0001",
    enableMastermindMem0: true,
    mastermindMem0UserId: "user-mastermind-0001",
    enableAgentMem0: true,
    agentMem0UserId: "user-agent-0001",
    enableToolsMem0: true,
    toolsMem0UserId: "user-tools-0001",
  };

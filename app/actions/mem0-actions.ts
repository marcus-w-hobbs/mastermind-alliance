// agent_id: chat-0001
// user_id: user-chat-0001
// app_id: backrooms-vercel-ai-chat
// run_id: run-0001
// infer: true
// output_format: v1.1
// immutable: false
// org_id: org_xo8D1knNQ6J3maUqCdOzrP0JiDmGIYr2T2FJV1mQ
// project_id: proj_iPAp1WyxIzM3A2pj3kxNfF9yLCUm6duppbH8xgTl
// version: v2

'use server';

import { Mem0Message } from '@/types/mem0-types';
import { currentUser } from '@clerk/nextjs/server';

/**
 * Helper function to append authenticated user's name to userId
 * @param baseUserId Base user identifier
 * @returns Promise with the enhanced userId or false if user not found
 */
async function appendUserNameToId(baseUserId: string): Promise<string | false> {
  const user = await currentUser();
  if (!user) {
    console.error("No user found in current session");
    return false;
  }
  
  // Use username instead of firstName/lastName since those can be null
  return `${baseUserId}-${user.username || 'user'}`;
}

/**
 * Adds a memory to Mem0 using their API
 * @param userId User identifier for this memory (should be unique per user)
 * @param messages Array of message objects representing the memory content
 * @param useEnhancedId Whether to append the user's name to the ID (default: true)
 * @returns Object indicating success status and any error details
 * @throws Error if API call fails
 */
export async function addMemory(
  userId: string, 
  messages: Mem0Message[], 
  useEnhancedId: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) {
      const error = 'MEM0_API_KEY is not defined in environment variables';
      console.error(error);
      return { success: false, error };
    }

    // Use enhanced ID only if requested
    let finalUserId = userId;
    if (useEnhancedId) {
      const enhancedUserId = await appendUserNameToId(userId);
      if (!enhancedUserId) {
        const error = "No user found in current session, using base userId";
        console.warn(error);
        // Continue with base userId instead of failing
      } else {
        finalUserId = enhancedUserId;
      }
    }

    console.log(`[Mem0] Adding memory for user: ${finalUserId}`);

    const payload = {
      messages,
      agent_id: "chat-0001",
      user_id: finalUserId,
      app_id: "backrooms-vercel-ai-chat",
      run_id: "run-0001",
      infer: true,
      metadata: {
        output_format: "v1.1",
        immutable: false,
        version: "v2"
      },
      org_id: "org_xo8D1knNQ6J3maUqCdOzrP0JiDmGIYr2T2FJV1mQ",
      project_id: "proj_iPAp1WyxIzM3A2pj3kxNfF9yLCUm6duppbH8xgTl"
    };
    
    console.log(`[Mem0] Sending payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.mem0.ai/v1/memories/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error = `Mem0 API Error (${response.status}): ${errorData?.message || response.statusText}`;
      console.error(`[Mem0] ${error}`, errorData);
      return { success: false, error };
    }
    
    const result = await response.json();
    console.log(`[Mem0] Memory added successfully:`, result);
    
    return { success: true };
  } catch (error) {
    const errorMessage = `Error adding memory: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[Mem0] ${errorMessage}`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Searches for memories using the Mem0 API
 * @param userId User identifier to filter memories (should be unique per user)
 * @param query Search query string
 * @param topK Number of results to return (default: 10)
 * @param useEnhancedId Whether to append the user's name to the ID (default: true)
 * @returns Concatenated memory content as a single string
 * @throws Error if API call fails
 */
export async function searchMemories(
  userId: string, 
  query: string, 
  topK: number = 10,
  useEnhancedId: boolean = true
): Promise<string> {
  try {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) {
      const error = 'MEM0_API_KEY is not defined in environment variables';
      console.error(error);
      return "";
    }
    
    // Use enhanced ID only if requested
    let finalUserId = userId;
    if (useEnhancedId) {
      const enhancedUserId = await appendUserNameToId(userId);
      if (!enhancedUserId) {
        console.warn("No user found in current session, using base userId");
        // Continue with base userId instead of failing
      } else {
        finalUserId = enhancedUserId;
      }
    }

    console.log(`[Mem0] Searching memories for user: ${finalUserId}, query: "${query}"`);
    
    const payload = {
      query,
      user_id: finalUserId,
      agent_id: "chat-0001",
      app_id: "backrooms-vercel-ai-chat",
      run_id: "run-0001",
      top_k: topK,
      fields: ["memory"],
      org_id: "org_xo8D1knNQ6J3maUqCdOzrP0JiDmGIYr2T2FJV1mQ",
      project_id: "proj_iPAp1WyxIzM3A2pj3kxNfF9yLCUm6duppbH8xgTl"
    };
    
    const response = await fetch('https://api.mem0.ai/v1/memories/search/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error = `Mem0 API Error (${response.status}): ${errorData?.message || response.statusText}`;
      console.error(`[Mem0] ${error}`, errorData);
      return "";
    }
    
    const results = await response.json();
    console.log(`[Mem0] Search results:`, results);

    // Check if no memories were found
    if (!results.length) {
      console.log(`[Mem0] No memories found for ${finalUserId}`);
      return "";
    }

    // Combine all memory contents into a single string
    const memories = results.map((item: { memory: string }) => item.memory).join('\n');
    console.log(`[Mem0] Retrieved ${results.length} memories`);
    return memories;
  } catch (error) {
    console.error('[Mem0] Error searching memories:', error);
    return "";
  }
}

/**
 * Lists all memories for a specific user
 * @param userId User identifier
 * @param useEnhancedId Whether to append the user's name to the ID (default: true)
 * @returns Array of memory objects or empty array on error
 */
export async function listUserMemories(
  userId: string,
  useEnhancedId: boolean = true
): Promise<Array<{ id: string; memory: string; created_at: string }>> {
  try {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) {
      console.error('MEM0_API_KEY is not defined');
      return [];
    }

    let finalUserId = userId;
    if (useEnhancedId) {
      const enhancedUserId = await appendUserNameToId(userId);
      if (enhancedUserId) {
        finalUserId = enhancedUserId;
      }
    }

    console.log(`[Mem0] Listing memories for user: ${finalUserId}`);

    const params = new URLSearchParams({
      user_id: finalUserId,
      agent_id: "chat-0001",
      app_id: "backrooms-vercel-ai-chat",
      org_id: "org_xo8D1knNQ6J3maUqCdOzrP0JiDmGIYr2T2FJV1mQ",
      project_id: "proj_iPAp1WyxIzM3A2pj3kxNfF9yLCUm6duppbH8xgTl"
    });

    const response = await fetch(`https://api.mem0.ai/v1/memories/?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(`[Mem0] List API Error:`, errorData);
      return [];
    }

    const data = await response.json();
    console.log(`[Mem0] Found ${data.results?.length || 0} memories`);
    return data.results || [];
  } catch (error) {
    console.error('[Mem0] Error listing memories:', error);
    return [];
  }
}


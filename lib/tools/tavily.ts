/**
 * Tavily search tools for AI SDK v5
 * Provides web search capabilities through Tavily API
 */

import { tool } from 'ai';
import { z } from 'zod';

interface TavilyConfig {
  apiKey: string;
}

interface TavilyOptions {
  excludeTools?: string[];
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
}

// Input schema for tavily search
const tavilySearchSchema = z.object({
  query: z.string().describe('The search query'),
  search_depth: z.enum(['basic', 'advanced']).optional().describe('Search depth - basic is faster, advanced is more thorough'),
  max_results: z.number().optional().describe('Maximum number of results to return'),
});

type TavilySearchInput = z.infer<typeof tavilySearchSchema>;

/**
 * Creates Tavily search tools compatible with AI SDK v5
 */
export function tavilyTools(config: TavilyConfig, options: TavilyOptions = {}) {
  const { apiKey } = config;
  const { excludeTools = [] } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  if (!excludeTools.includes('tavily_search')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools.tavily_search = (tool as any)({
      description: 'Search the web for current information using Tavily. Use this for finding up-to-date information, news, facts, and general knowledge questions.',
      parameters: tavilySearchSchema,
      execute: async (input: TavilySearchInput) => {
        const { query, search_depth = 'basic', max_results = 5 } = input;
        try {
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: apiKey,
              query,
              search_depth,
              max_results,
              include_answer: true,
              include_raw_content: false,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Tavily API error: ${response.status} - ${error}`);
          }

          const data: TavilyResponse = await response.json();

          // Format results for the AI
          const formattedResults = data.results.map((r, i) =>
            `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
          ).join('\n\n');

          return {
            answer: data.answer || null,
            results: formattedResults,
            resultCount: data.results.length,
          };
        } catch (error) {
          console.error('[Tavily] Search error:', error);
          return {
            error: error instanceof Error ? error.message : 'Unknown error',
            results: '',
            resultCount: 0,
          };
        }
      },
    });
  }

  return tools;
}

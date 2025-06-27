import { ZodSchema } from "zod";
import { z } from "genkit";

/**
 * Supported LLM providers for the news API
 * - google: Google's Generative AI models (Gemini)
 * - anthropic: Anthropic's Claude models
 * - openai: OpenAI's GPT models
 * - mock: Mock client for testing
 * - claude: Alias for anthropic (legacy support)
 */
export type LLMProvider = 'google' | 'anthropic' | 'openai' | 'mock' | 'claude';

/**
 * Configuration object for initializing an LLM client
 */
export interface LLMConfig {
  /** The LLM provider to use */
  provider: LLMProvider;
  /** The specific model name to use */
  model: string;
  /** API key for the provider (optional for mock client) */
  apiKey?: string;
}

/**
 * Represents a news topic with associated sources
 */
export type Topic = {
  /** The name/identifier of the topic */
  name: string;
  /** Array of URLs pointing to news sources for this topic */
  sources: string[];
};

/**
 * Interface defining the contract for LLM clients
 * All LLM implementations must implement these methods
 */
export interface LLMClient {
  /**
   * Generate text response from a prompt
   * @param prompt - The input prompt to send to the LLM
   * @returns Promise resolving to the generated text
   */
  generateText(prompt: string): Promise<string>;
  
  /**
   * Generate structured output using a Zod schema
   * @param prompt - The input prompt to send to the LLM
   * @param schema - Zod schema defining the expected output structure
   * @returns Promise resolving to the structured data
   */
  generateStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T>;
  
  /**
   * Stream text response from a prompt
   * @param prompt - The input prompt to send to the LLM
   * @param systemPrompt - Optional system prompt to guide the model's behavior
   * @returns AsyncGenerator yielding text chunks
   */
  streamText(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
  
  /**
   * Generate text with web search capabilities
   * @param prompt - The input prompt to send to the LLM
   * @returns Promise resolving to the generated text with search results
   */
  generateTextWithSearch(prompt: string): Promise<string>;
  
  /**
   * Generate structured output with web search capabilities
   * @param prompt - The input prompt to send to the LLM
   * @param schema - Zod schema defining the expected output structure
   * @returns Promise resolving to the structured data with search results
   */
  generateTextWithSearchStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T>;
}

/**
 * Zod schema for validating news sources
 * Each source must have an ID, name, URL, description, and category
 */
export const sourcesSchema = z.object({
    sources: z.array(z.object({
        id: z.number().describe('ID of the news source'),
        name: z.string().describe('Name of the news source'),
        url: z.string().describe('URL of the news source'),
        description: z.string().describe('Description of the news source'),
        category: z.string().describe('Category of the news source')
    })).describe('Array of news sources'),
});

/** TypeScript type derived from the sources schema */
export type Sources = z.infer<typeof sourcesSchema>;

/**
 * Schema for topic assignment responses from the LLM
 * Used when categorizing news content into topics
 */
export const TopicAssignmentSchema = z.object({
  /** The name of the topic (either existing or new) */
  topicName: z.string().min(1, "Topic name cannot be empty."),
  /** Whether this is a new topic (true) or existing topic (false) */
  isNew: z.boolean(),
  /** Optional array of URLs for further reading (max 3) */
  furtherReadings: z.array(z.string()).max(3, "Maximum of 3 further readings allowed").optional().describe('Array of URLs for further reading for the topic'),
});

/**
 * Schema for the LLM's categorization response
 * Contains an array of topic assignments and optional skip flag
 */
export const CategorizationResponseSchema = z.object({
  /** Array of topic assignments (max 5) */
  assignments: z.array(TopicAssignmentSchema)
      .max(5, "Maximum of 5 topic assignments are allowed."),
  /** Whether to skip processing this content item */
  skip: z.boolean().optional().describe('Whether to skip the content item'),
});

/** TypeScript types derived from the categorization schemas */
export type CategorizationResponse = z.infer<typeof CategorizationResponseSchema>;
export type TopicAssignment = z.infer<typeof TopicAssignmentSchema>;

/**
 * Schema for individual news summary response items
 * Used when generating summaries for news topics
 */
export const newsSummaryResponseItemSchema = z.object({
  /** Unique identifier for the news story */
  id: z.number().describe('ID of the news story'),
  /** Title of the news story */
  title: z.string().describe('Title of the news story'),
  /** Summary content of the news story */
  summary: z.string().describe('Summary of the news story'),
  /** URL or path to an image representing the news story */
  image: z.string().describe('Image of the news story'),
});

/** TypeScript type derived from the news summary schema */
export type NewsSummaryResponseItem = z.infer<typeof newsSummaryResponseItemSchema>;

import { ZodSchema } from "zod";
import { z } from "genkit";

export type LLMProvider = 'google' | 'anthropic' | 'openai' | 'mock' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
}

export type Topic = {
  name: string;
  sources: string[];
};

export interface LLMClient {
  generateText(prompt: string): Promise<string>;
  generateStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T>;
  streamText(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
  generateTextWithSearch(prompt: string): Promise<string>;
  generateTextWithSearchStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T>;
}

export const sourcesSchema = z.object({
    sources: z.array(z.object({
        id: z.number().describe('ID of the news source'),
        name: z.string().describe('Name of the news source'),
        url: z.string().describe('URL of the news source'),
        description: z.string().describe('Description of the news source'),
        category: z.string().describe('Category of the news source')
    })).describe('Array of news sources'),
});

export type Sources = z.infer<typeof sourcesSchema>;

export const TopicAssignmentSchema = z.object({
  topicName: z.string().min(1, "Topic name cannot be empty."),
  isNew: z.boolean(),
  furtherReadings: z.array(z.string()).optional().describe('Array of URLs for further reading for the topic'),
});

// Schema for the LLM's categorization response for a single piece of content
export const CategorizationResponseSchema = z.object({
  assignments: z.array(TopicAssignmentSchema)
      .min(1, "At least one topic assignment is required."), // Or .optional() if an empty array is valid
});

// Infer the TypeScript type from the Zod schema
export type CategorizationResponse = z.infer<typeof CategorizationResponseSchema>;
export type TopicAssignment = z.infer<typeof TopicAssignmentSchema>;

export const newsSummaryResponseItemSchema = z.object({
  id: z.number().describe('ID of the news story'),
  title: z.string().describe('Title of the news story'),
  summary: z.string().describe('Summary of the news story'),
  image: z.string().describe('Image of the news story'),
});

export type NewsSummaryResponseItem = z.infer<typeof newsSummaryResponseItemSchema>;

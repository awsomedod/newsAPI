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

export type PersistentMemory = {
  topics: Topic[];
}

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

export const categoriesSchema = z.object({
    categoryArray: z.array(z.object({
        category: z.string().describe('Category of a news story'),
        sources: z.array(z.number().describe('Index of a source')).describe('Array of source indices')
    })).describe('Array of categoried news stories'),
});

export type Categories = z.infer<typeof categoriesSchema>;

export const newsSummaryResponseItemSchema = z.object({
  id: z.number().describe('ID of the news story'),
  title: z.string().describe('Title of the news story'),
  summary: z.string().describe('Summary of the news story'),
  image: z.string().describe('Image of the news story'),
});

export type NewsSummaryResponseItem = z.infer<typeof newsSummaryResponseItemSchema>;

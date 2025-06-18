import { ZodSchema } from "zod";
import { z } from "genkit";

export type LLMProvider = 'google' | 'anthropic' | 'openai' | 'mock';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
}

export interface LLMClient {
  generateText(prompt: string): Promise<string>;
  generateStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T>;
  streamText(prompt: string, systemPrompt?: string): AsyncGenerator<string>;
}

export const sourcesSchema = z.object({
    urlArray: z.array(z.string().describe('URL of a news source')).describe('Array of URLs'),
});

export type Sources = z.infer<typeof sourcesSchema>;

export const categoriesSchema = z.object({
    categoryArray: z.array(z.object({
        category: z.string().describe('Category of a news story'),
        sources: z.array(z.number().describe('Index of a source')).describe('Array of source indices')
    })).describe('Array of categoried news stories'),
});

export type Categories = z.infer<typeof categoriesSchema>;




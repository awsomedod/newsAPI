import { googleAI } from '@genkit-ai/googleai';
// import Anthropic from '@anthropic-ai/sdk';
import { genkit, Genkit } from 'genkit';
import { config } from 'dotenv';
import { ZodSchema } from 'zod';
import { LLMClient, LLMConfig } from './types';
import { GoogleGenAI, Type } from "@google/genai";


config();

/**
 * Set of supported Google Gemini models
 * These models are compatible with the Google Generative AI API
 */
const GoogleModel: Set<string> = new Set(['gemini-2.0-flash-lite', 
  'gemini-2.0-flash', 
  'gemini-2.5-flash-preview-05-20',
  'gemini-1.5-flash']);

/**
 * Set of supported Claude models
 * These models are compatible with Anthropic's API
 */
const ClaudeModel: Set<string> = new Set([
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
]);



/**
 * Mock LLM client for testing and development
 * Provides simulated responses without making actual API calls
 */
export class MockClient implements LLMClient {
  constructor(private config: LLMConfig){}
  /**
   * Generate a mock text response
   * @param prompt - The input prompt
   * @returns Promise resolving to a mock response
   */
  async generateText(prompt: string): Promise<string> {
    return `This is a mock response for model ${this.config.model} to the prompt: ${prompt}`;
  }

  /**
   * Generate a mock structured response
   * @param prompt - The input prompt
   * @returns Promise resolving to a mock structured response
   */
  async generateStructuredOutput<T>(prompt: string): Promise<T> {
    const mockResponse = {
      message: `This is a mock structured response for model ${this.config.model}`,
      prompt: prompt,
    };
    return mockResponse as T;
  }

  /**
   * Stream mock text response word by word
   * @param prompt - The input prompt
   * @returns AsyncGenerator yielding mock text chunks
   */
  async *streamText(prompt: string): AsyncGenerator<string> {
    const response = `This is a mock stream response for model ${this.config.model} to the prompt: ${prompt}`;
    for (const word of response.split(' ')) {
      yield word + ' ';
      // simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Generate a mock search response
   * @param prompt - The input prompt
   * @returns Promise resolving to a mock search response
   */
  async generateTextWithSearch(prompt: string): Promise<string> {
    return `This is a mock search response for model ${this.config.model} to the prompt: ${prompt}`;
  }

  /**
   * Generate a mock structured search response
   * @param prompt - The input prompt
   * @param schema - The expected output schema
   * @returns Promise resolving to a mock structured search response
   */
  async generateTextWithSearchStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T> {
    const mockResponse = {
      message: `This is a mock structured search response for model ${this.config.model}`,
      prompt: prompt,
      schema: schema,
    };
    return mockResponse as T;
  }
}

/**
 * Google Generative AI client implementation
 * Provides access to Google's Gemini models through the Genkit framework
 */
export class GoogleGenAIClient implements LLMClient {
  private client: Genkit;
  private googleAI: GoogleGenAI;
  private model: string;
  
  /**
   * Initialize the Google GenAI client
   * @param config - Configuration object containing provider, model, and API key
   * @throws Error if the model is not supported
   */
  constructor(config: LLMConfig) {
    if (GoogleModel.has(config.model)) {
      console.log(`Using Google model: ${config.model}`);
    } else {
      throw new Error(`Invalid Google model: ${config.model}. Supported models are: ${Array.from(GoogleModel).join(', ')}`);
    }
    this.client = genkit({
      plugins: [googleAI({apiKey: config.apiKey })],
      model: googleAI.model(config.model)
    });
    this.googleAI = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }
  
    
  /**
   * Generate text response using Google's Gemini model
   * @param prompt - The input prompt
   * @param systemPrompt - Optional system prompt to guide the model's behavior
   * @returns Promise resolving to the generated text
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    if (systemPrompt) {
      const { text } = await this.client.generate({system: systemPrompt, prompt: prompt});
      return text;
    } else {
      const { text } = await this.client.generate({prompt: prompt});
      return text;
    }
  }

  /**
   * Generate structured output using a Zod schema
   * @param prompt - The input prompt
   * @param schema - Zod schema defining the expected output structure
   * @returns Promise resolving to the structured data
   */
  async generateStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T> {
    const result = await this.client.generate({
        prompt: prompt,
        output: { schema: schema}
    });

    const responseText = await result.text;
    return JSON.parse(responseText) as T;
  }
  

  /**
   * Stream text response from Google's Gemini model
   * @param prompt - The input prompt
   * @param systemPrompt - Optional system prompt to guide the model's behavior
   * @returns AsyncGenerator yielding text chunks
   */
  async *streamText(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
    if (systemPrompt) {
      const { stream } = await this.client.generateStream({system: systemPrompt, prompt: prompt});
      for await (const chunk of stream) {
        yield chunk.text;
    }
    } else {
      const { stream } = await this.client.generateStream(prompt);
      for await (const chunk of stream) {
        yield chunk.text;
    }
    }

  }

  /**
   * Generate text with web search capabilities using Google's grounding tools
   * @param prompt - The input prompt
   * @returns Promise resolving to the generated text with search results
   */
  async generateTextWithSearch(prompt: string): Promise<string> {
    const groundingTool = {
      googleSearch: {},
    };

    const config = {
      tools: [groundingTool],
    };

    const response = await this.googleAI.models.generateContent({
      model: this.model,
      contents: prompt,
      config,
    });

    return response.text;
  }

  /**
   * Generate structured output with web search capabilities
   * @param prompt - The input prompt
   * @param schema - Zod schema defining the expected output structure
   * @returns Promise resolving to the structured data with search results
   */
  async generateTextWithSearchStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T> {
    const stringResponse = await this.generateTextWithSearch(prompt);
    const response: T = await this.generateStructuredOutput<T>(stringResponse, schema);

    return response;
  }



}



/**
 * Factory function to create the appropriate LLM client based on configuration
 * @param config - Configuration object specifying the provider and model
 * @returns An instance of the appropriate LLM client
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case 'mock':
        return new MockClient(config);
    case 'google':
      return new GoogleGenAIClient(config);
    // case 'claude':
    //   return new ClaudeGenAIClient(config);
    // case 'anthropic':
    //   // return new AnthropicClient(config);
    // case 'openai':
    //   // return new OpenAIClient(config);
    default:
      // For now, let's just return a mock client if not specified.
      // In a real app, you might throw an error.
      console.warn(`Unsupported or unspecified LLM provider: ${config.provider}, returning a mock client.`);
      return new MockClient(config);
  }
}


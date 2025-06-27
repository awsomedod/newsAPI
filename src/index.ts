import express from 'express';
import { z } from 'zod';
import { createLLMClient } from './ai/llm_client';
import { suggestNewsSources, provideNews } from './ai/agent';
import { LLMConfig, NewsSummaryResponseItem, Sources } from './ai/types';
import cors from 'cors';

/**
 * Express application instance
 * Main server application for the News API
 */
const app = express();

// Configure CORS middleware for cross-origin requests
app.use(cors({
  origin: 'http://localhost:3000', // Your React app URL
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

/**
 * Validation schemas for request validation
 * These ensure that incoming requests have the correct structure and data types
 */

/**
 * Schema for LLM client initialization requests
 * Validates provider, model, and optional API key
 */
const llmConfigSchema = z.object({
  provider: z.enum(['google', 'anthropic', 'openai', 'mock']),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().optional()
});

/**
 * Schema for news source suggestion requests
 * Validates topic and bias parameters
 */
const suggestSourcesSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  bias: z.string().min(1, 'Bias is required')
});

/**
 * Schema for news summary generation requests
 * Validates that at least one source URL is provided
 */
const newsSummarySchema = z.object({
  sources: z.array(z.string().min(1, 'At least one source is required'))
});

/**
 * Global variable to store the initialized LLM client
 * This client is used across all API endpoints that require LLM functionality
 */
let llmClient: any = null;

/**
 * Health check endpoint
 * Returns a simple greeting message to verify the server is running
 */
app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

/**
 * Initialize the LLM client with the provided configuration
 * This endpoint must be called before using other LLM-dependent endpoints
 * 
 * POST /api/init-llm
 * Body: { provider: string, model: string, apiKey?: string }
 * 
 * @param req - Express request object containing LLM configuration
 * @param res - Express response object
 */
app.post('/api/init-llm', async (req, res) => {
  try {
    // Validate the request body against the schema
    const config = llmConfigSchema.parse(req.body);
    
    // Create the LLM client with proper type casting
    llmClient = createLLMClient(config as LLMConfig);
    
    // Return success response with configuration details
    res.json({ 
      success: true, 
      message: 'LLM client initialized successfully',
      provider: config.provider,
      model: config.model
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration', 
        details: error.errors 
      });
    } else {
      // Handle other errors
      console.error('Error initializing LLM client:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to initialize LLM client' 
      });
    }
  }
});

/**
 * Suggest news sources based on topic and bias
 * Uses the LLM client to search for and recommend relevant news sources
 * 
 * POST /api/suggest-sources
 * Body: { topic: string, bias: string }
 * 
 * @param req - Express request object containing topic and bias
 * @param res - Express response object
 */
app.post('/api/suggest-sources', async (req, res) => {
  try {
    // Check if LLM client is initialized
    if (!llmClient) {
      return res.status(400).json({ 
        success: false, 
        error: 'LLM client not initialized. Please call /api/init-llm first.' 
      });
    }

    // Validate the request body against the schema
    const { topic, bias } = suggestSourcesSchema.parse(req.body);
    
    // Generate source suggestions using the LLM client
    const sources: Sources = await suggestNewsSources(topic, bias, llmClient);
    
    // Return the suggested sources
    res.json({ 
      success: true, 
      sources: sources.sources 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request data', 
        details: error.errors 
      });
    } else {
      // Handle other errors
      console.error('Error suggesting news sources:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to suggest news sources' 
      });
    }
  }
});

/**
 * Generate news summary from provided sources
 * Processes multiple news sources, categorizes content into topics,
 * and generates summaries that are streamed to the client
 * 
 * POST /api/news-summary
 * Body: { sources: string[] }
 * 
 * This endpoint uses Server-Sent Events (SSE) to stream results
 * as they are generated, providing real-time updates to the client
 * 
 * @param req - Express request object containing source URLs
 * @param res - Express response object for streaming
 */
app.post('/api/news-summary', async (req, res) => {
  try {
    // Check if LLM client is initialized
    if (!llmClient) {
      return res.status(400).json({ 
        success: false, 
        error: 'LLM client not initialized. Please call /api/init-llm first.' 
      });
    }

    // Set up Server-Sent Events headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush the headers to establish the connection

    // Validate the request body against the schema
    const sources = newsSummarySchema.parse(req.body).sources;
    
    // Process the news sources and stream results
    await provideNews(sources, llmClient, res);

    // Handle client disconnect
    req.on('close', () => {
      console.log('Client closed connection.');
      res.end();
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request data', 
        details: error.errors 
      });
    } else {
      // Handle other errors
      console.error('Error generating news summary:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate news summary' 
      });
    }
  }
});

// Export the app for testing purposes
export default app;

/**
 * Start the server if not in test environment
 * The server runs on port 3001 by default
 */
if (process.env.NODE_ENV !== 'test') {
  const port = parseInt('3001');
  app.listen(port, () => {
    console.log(`News API server listening on port ${port}`);
  });
}



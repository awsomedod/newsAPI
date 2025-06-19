import express from 'express';
import { z } from 'zod';
import { createLLMClient } from './ai/llm_client';
import { suggestNewsSources, provideNews } from './ai/agent';
import { LLMConfig, NewsSummaryResponseItem, Sources } from './ai/types';
import cors from 'cors';

const app = express();

// Add CORS middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your React app URL
  credentials: true
}));

app.use(express.json());


// Validation schemas
const llmConfigSchema = z.object({
  provider: z.enum(['google', 'anthropic', 'openai', 'mock']),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().optional()
});

const suggestSourcesSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  bias: z.string().min(1, 'Bias is required')
});

const newsSummarySchema = z.object({
  sources: z.array(z.string().min(1, 'At least one source is required'))
});

// Global variable to store the LLM client
let llmClient: any = null;

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

/**
 * Initialize the LLM client with the provided configuration
 */
app.post('/api/init-llm', async (req, res) => {
  try {
    const config = llmConfigSchema.parse(req.body);
    
    // Create the LLM client with proper type casting
    llmClient = createLLMClient(config as LLMConfig);
    
    res.json({ 
      success: true, 
      message: 'LLM client initialized successfully',
      provider: config.provider,
      model: config.model
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid configuration', 
        details: error.errors 
      });
    } else {
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

    const { topic, bias } = suggestSourcesSchema.parse(req.body);
    
    const sources: Sources = await suggestNewsSources(topic, bias, llmClient);
    
    res.json({ 
      success: true, 
      sources: sources.sources 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request data', 
        details: error.errors 
      });
    } else {
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

    const sources = newsSummarySchema.parse(req.body).sources;
    
    // // Set response headers for streaming
    // res.setHeader('Content-Type', 'text/plain');
    // res.setHeader('Transfer-Encoding', 'chunked');
    
    // Call the provideNews function and stream the response
    const summary: NewsSummaryResponseItem[] = await provideNews(sources, llmClient);
    
    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request data', 
        details: error.errors 
      });
    } else {
      console.error('Error generating news summary:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate news summary' 
      });
    }
  }
});


export default app;

if (process.env.NODE_ENV !== 'test') {
  const port = parseInt('3001');
  app.listen(port, () => {
    console.log(`listening on port ${port}`);
  });
}



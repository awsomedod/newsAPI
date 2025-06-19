import request from 'supertest';
import app from '../src/index';

describe('News API Endpoints', () => {
  describe('POST /api/init-llm', () => {
    it('should initialize LLM client with valid config', async () => {
      const response = await request(app)
        .post('/api/init-llm')
        .send({
          provider: 'mock',
          model: 'test-model'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('LLM client initialized successfully');
      expect(response.body.provider).toBe('mock');
      expect(response.body.model).toBe('test-model');
    });

    it('should return error for invalid provider', async () => {
      const response = await request(app)
        .post('/api/init-llm')
        .send({
          provider: 'invalid-provider',
          model: 'test-model'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid configuration');
    });

    it('should return error for missing model', async () => {
      const response = await request(app)
        .post('/api/init-llm')
        .send({
          provider: 'mock'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid configuration');
    });
  });

  describe('GET /api/llm-status', () => {
    it('should return not initialized status initially', async () => {
      const response = await request(app)
        .get('/api/llm-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.initialized).toBe(false);
    });

    it('should return initialized status after init', async () => {
      // First initialize the client
      await request(app)
        .post('/api/init-llm')
        .send({
          provider: 'mock',
          model: 'test-model'
        });

      // Then check status
      const response = await request(app)
        .get('/api/llm-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.initialized).toBe(true);
    });
  });

  describe('POST /api/suggest-sources', () => {
    beforeEach(async () => {
      // Initialize LLM client before each test
      await request(app)
        .post('/api/init-llm')
        .send({
          provider: 'mock',
          model: 'test-model'
        });
    });

    it('should return error when LLM client not initialized', async () => {
      // Reset the client by restarting the app
      const freshApp = require('../src/index').default;
      
      const response = await request(freshApp)
        .post('/api/suggest-sources')
        .send({
          topic: 'technology',
          bias: 'balanced'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('LLM client not initialized. Please call /api/init-llm first.');
    });

    it('should suggest sources with valid input', async () => {
      const response = await request(app)
        .post('/api/suggest-sources')
        .send({
          topic: 'technology',
          bias: 'balanced'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sources).toBeDefined();
      expect(Array.isArray(response.body.sources)).toBe(true);
    });

    it('should return error for missing topic', async () => {
      const response = await request(app)
        .post('/api/suggest-sources')
        .send({
          bias: 'balanced'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return error for missing bias', async () => {
      const response = await request(app)
        .post('/api/suggest-sources')
        .send({
          topic: 'technology'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('POST /api/news-summary', () => {
    beforeEach(async () => {
      // Initialize LLM client before each test
      await request(app)
        .post('/api/init-llm')
        .send({
          provider: 'mock',
          model: 'test-model'
        });
    });

    it('should return error when LLM client not initialized', async () => {
      // Reset the client by restarting the app
      const freshApp = require('../src/index').default;
      
      const response = await request(freshApp)
        .post('/api/news-summary')
        .send({
          sources: ['https://example.com/news1']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('LLM client not initialized. Please call /api/init-llm first.');
    });

    it('should return error for invalid URLs', async () => {
      const response = await request(app)
        .post('/api/news-summary')
        .send({
          sources: ['invalid-url']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should return error for empty sources array', async () => {
      const response = await request(app)
        .post('/api/news-summary')
        .send({
          sources: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should accept valid URLs', async () => {
      const response = await request(app)
        .post('/api/news-summary')
        .send({
          sources: ['https://example.com/news1', 'https://bbc.com/news']
        })
        .expect(200);

      // The response should be text since it's streamed
      expect(typeof response.text).toBe('string');
    });
  });

  describe('GET /', () => {
    it('should return hello message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('Hello');
    });
  });
}); 
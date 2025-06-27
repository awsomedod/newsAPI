# News API Documentation

This document provides comprehensive details about the API endpoints for the News API application, which uses Large Language Models (LLMs) to process, categorize, and summarize news content.

## Base URL

The base URL for all API endpoints is:
`http://localhost:3001`

## Overview

The News API is a sophisticated service that leverages AI to:
- Suggest relevant news sources based on topics and bias preferences
- Process and categorize news content from multiple sources
- Generate intelligent summaries using LLM technology
- Stream results in real-time using Server-Sent Events (SSE)

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible. In a production environment, consider implementing proper authentication mechanisms.

---

## API Endpoints

### 1. Health Check

Returns a simple greeting to verify the server is running.

*   **Endpoint:** `GET /`
*   **Method:** `GET`
*   **Headers:** None required
*   **Success Response (200 OK):**

    ```json
    "Hello World!"
    ```

---

### 2. LLM Client Initialization

Initializes the LLM client with the specified configuration. This endpoint must be called before using other LLM-dependent endpoints.

*   **Endpoint:** `POST /api/init-llm`
*   **Method:** `POST`
*   **Headers:**
    *   `Content-Type: application/json`
*   **Request Body:**

    ```json
    {
      "provider": "google",
      "model": "gemini-2.0-flash-lite",
      "apiKey": "your_api_key_here"
    }
    ```

    **Provider Options:**
    - `"google"` - Google Gemini models
    - `"anthropic"` - Anthropic Claude models  
    - `"openai"` - OpenAI GPT models
    - `"mock"` - Mock client for testing

    **Model Examples:**
    - Google: `"gemini-2.0-flash-lite"`, `"gemini-2.0-flash"`, `"gemini-2.5-flash-preview-05-20"`, `"gemini-1.5-flash"`
    - Claude: `"claude-3-5-sonnet-20241022"`, `"claude-3-5-haiku-20241022"`, `"claude-3-opus-20240229"`, `"claude-3-sonnet-20240229"`, `"claude-3-haiku-20240307"`

*   **Success Response (200 OK):**

    ```json
    {
      "success": true,
      "message": "LLM client initialized successfully",
      "provider": "google",
      "model": "gemini-2.0-flash-lite"
    }
    ```

*   **Error Response (400 Bad Request):**

    If the configuration is invalid:
    ```json
    {
      "success": false,
      "error": "Invalid configuration",
      "details": [
        {
          "code": "invalid_enum_value",
          "expected": "google | anthropic | openai | mock",
          "received": "invalid_provider",
          "path": ["provider"]
        }
      ]
    }
    ```

*   **Error Response (500 Internal Server Error):**

    If LLM client initialization fails:
    ```json
    {
      "success": false,
      "error": "Failed to initialize LLM client"
    }
    ```

---

### 3. News Source Suggestions

Uses AI to suggest relevant news sources based on a topic and bias preference.

*   **Endpoint:** `POST /api/suggest-sources`
*   **Method:** `POST`
*   **Headers:**
    *   `Content-Type: application/json`
*   **Request Body:**

    ```json
    {
      "topic": "artificial intelligence",
      "bias": "neutral"
    }
    ```

    **Bias Options:**
    - `"liberal"` - Left-leaning sources
    - `"conservative"` - Right-leaning sources
    - `"neutral"` - Balanced sources
    - `"progressive"` - Progressive sources
    - `"centrist"` - Centrist sources

*   **Success Response (200 OK):**

    ```json
    {
      "success": true,
      "sources": [
        {
          "id": 123456,
          "name": "TechCrunch",
          "url": "https://techcrunch.com/tag/artificial-intelligence/",
          "description": "Latest news and analysis on artificial intelligence",
          "category": "Technology"
        },
        {
          "id": 789012,
          "name": "MIT Technology Review",
          "url": "https://www.technologyreview.com/topic/artificial-intelligence/",
          "description": "In-depth coverage of AI research and developments",
          "category": "Research"
        }
      ]
    }
    ```

*   **Error Response (400 Bad Request):**

    If LLM client is not initialized:
    ```json
    {
      "success": false,
      "error": "LLM client not initialized. Please call /api/init-llm first."
    }
    ```

    If request validation fails:
    ```json
    {
      "success": false,
      "error": "Invalid request data",
      "details": [
        {
          "code": "too_small",
          "minimum": 1,
          "type": "string",
          "inclusive": true,
          "exact": false,
          "message": "Topic is required",
          "path": ["topic"]
        }
      ]
    }
    ```

*   **Error Response (500 Internal Server Error):**

    If source suggestion fails:
    ```json
    {
      "success": false,
      "error": "Failed to suggest news sources"
    }
    ```

---

### 4. News Summary Generation

Processes multiple news sources, categorizes content into topics, and generates summaries. This endpoint uses Server-Sent Events (SSE) to stream results in real-time.

*   **Endpoint:** `POST /api/news-summary`
*   **Method:** `POST`
*   **Headers:**
    *   `Content-Type: application/json`
*   **Request Body:**

    ```json
    {
      "sources": [
        "https://example.com/news/article1",
        "https://example.com/news/article2",
        "https://example.com/news/article3"
      ]
    }
    ```

*   **Response Format:**

    The response uses Server-Sent Events (SSE) format. Each news summary is sent as a separate event:

    ```
    data: {"id":123456,"title":"AI Breakthrough in Healthcare","summary":"Researchers have developed...","image":"https://example.com/image.jpg"}

    data: {"id":789012,"title":"Climate Change Policy Updates","summary":"New international agreements...","image":"https://example.com/image2.jpg"}

    ```

*   **Success Response (200 OK with SSE):**

    Each event contains a JSON object with:
    ```json
    {
      "id": 123456,
      "title": "News Story Title",
      "summary": "Comprehensive summary of the news story (400-500 words)",
      "image": "URL to relevant image"
    }
    ```

*   **Error Response (400 Bad Request):**

    If LLM client is not initialized:
    ```json
    {
      "success": false,
      "error": "LLM client not initialized. Please call /api/init-llm first."
    }
    ```

    If request validation fails:
    ```json
    {
      "success": false,
      "error": "Invalid request data",
      "details": [
        {
          "code": "too_small",
          "minimum": 1,
          "type": "array",
          "inclusive": true,
          "exact": false,
          "message": "At least one source is required",
          "path": ["sources"]
        }
      ]
    }
    ```

*   **Error Response (500 Internal Server Error):**

    If summary generation fails:
    ```json
    {
      "success": false,
      "error": "Failed to generate news summary"
    }
    ```

---

## Error Handling

The API implements comprehensive error handling:

### Validation Errors
All request bodies are validated using Zod schemas. Invalid requests return detailed error messages with specific field information.

### LLM Errors
Errors from LLM providers are caught and returned as user-friendly error messages.

### Network Errors
Network-related errors (timeouts, connection failures) are handled gracefully with appropriate HTTP status codes.

### Streaming Errors
For the news summary endpoint, client disconnections are handled cleanly without affecting the server.

## Rate Limiting

Currently, the API does not implement rate limiting. In production, consider implementing rate limiting to prevent abuse.

## CORS Configuration

The API is configured to accept requests from `http://localhost:3000` by default. Update the CORS configuration in the source code for production use.

## Dependencies

### External Services
- **Proxy Service**: Requires a separate proxy service running on port 5000 for web content fetching
- **LLM Providers**: Requires valid API keys for Google, Anthropic, or OpenAI

### Internal Dependencies
- **Express.js**: Web framework
- **Zod**: Schema validation
- **CORS**: Cross-origin resource sharing
- **JSDOM**: HTML parsing
- **Readability**: Content extraction
- **Genkit**: LLM framework

## Testing

Test the API endpoints using tools like:
- **cURL**: Command-line HTTP client
- **Postman**: API testing tool
- **Insomnia**: API client
- **Browser**: For SSE testing

### Example cURL Commands

```bash
# Health check
curl http://localhost:3001/

# Initialize LLM client
curl -X POST http://localhost:3001/api/init-llm \
  -H "Content-Type: application/json" \
  -d '{"provider":"mock","model":"test-model"}'

# Suggest sources
curl -X POST http://localhost:3001/api/suggest-sources \
  -H "Content-Type: application/json" \
  -d '{"topic":"technology","bias":"neutral"}'

# Generate summaries (streaming)
curl -X POST http://localhost:3001/api/news-summary \
  -H "Content-Type: application/json" \
  -d '{"sources":["https://example.com/news"]}'
```

## Versioning

The current API version is v1.0. Future versions will maintain backward compatibility where possible.

## Support

For technical support or questions:
1. Check the README.md for setup instructions
2. Review the source code comments for implementation details
3. Open an issue on the repository
4. Contact the development team

---

**Note**: This API is designed for development and demonstration purposes. For production use, implement proper authentication, rate limiting, and security measures. 
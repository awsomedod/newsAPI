# News API - Intelligent News Processing Service

A sophisticated Node.js API service that uses Large Language Models (LLMs) to process, categorize, and summarize news content from multiple sources. The service provides intelligent news source suggestions, content categorization, and real-time news summarization with streaming capabilities.

## Features

- **Multi-LLM Support**: Compatible with Google Gemini, Anthropic Claude, OpenAI GPT, and mock providers
- **Intelligent News Categorization**: Automatically categorizes news content into topics using AI
- **Real-time Streaming**: Server-Sent Events (SSE) for live news summary delivery
- **Smart Source Suggestions**: AI-powered news source recommendations based on topics and bias preferences
- **Content Processing**: Fetches and processes web content with intelligent filtering
- **Structured Output**: Type-safe responses using Zod schema validation
- **CORS Support**: Configured for cross-origin requests from frontend applications

## Architecture

The application follows a modular architecture with clear separation of concerns:

```
src/
├── ai/                    # AI/LLM related modules
│   ├── types.ts          # TypeScript type definitions and Zod schemas
│   ├── llm_client.ts     # LLM client implementations and factory
│   └── agent.ts          # News processing and categorization logic
└── index.ts              # Express server and API endpoints
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- API keys for your chosen LLM provider (Google, Anthropic, or OpenAI)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd newsAPI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
```bash
# Create a .env file with your API keys
GOOGLE_API_KEY=your_google_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Usage

### Development Mode

Start the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Production Mode

Build and start the production server:
```bash
npm run build
npm start
```

### Testing

Run the test suite:
```bash
npm test
```

## API Endpoints

### 1. Health Check
- **GET** `/` - Returns a simple greeting to verify server status

### 2. LLM Client Initialization
- **POST** `/api/init-llm` - Initialize the LLM client with configuration
  ```json
  {
    "provider": "google",
    "model": "gemini-2.0-flash-lite",
    "apiKey": "your_api_key"
  }
  ```

### 3. News Source Suggestions
- **POST** `/api/suggest-sources` - Get AI-recommended news sources
  ```json
  {
    "topic": "artificial intelligence",
    "bias": "neutral"
  }
  ```

### 4. News Summary Generation
- **POST** `/api/news-summary` - Generate summaries from multiple sources (streaming)
  ```json
  {
    "sources": ["https://example.com/news1", "https://example.com/news2"]
  }
  ```

## Supported LLM Providers

### Google Gemini
- **Models**: `gemini-2.0-flash-lite`, `gemini-2.0-flash`, `gemini-2.5-flash-preview-05-20`, `gemini-1.5-flash`
- **Features**: Text generation, structured output, streaming, web search

### Anthropic Claude
- **Models**: `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- **Features**: Text generation, structured output, streaming

### Mock Provider
- **Purpose**: Testing and development without API costs
- **Features**: Simulated responses with realistic delays

## Configuration

### CORS Settings
The API is configured to accept requests from `http://localhost:3000` by default. Update the CORS configuration in `src/index.ts` for production use.

### Port Configuration
The server runs on port 3001 by default. Change the port in `src/index.ts` if needed.

## Error Handling

The API includes comprehensive error handling:
- **Validation Errors**: Zod schema validation for all request bodies
- **LLM Errors**: Graceful handling of LLM provider errors
- **Network Errors**: Proper error responses for network issues
- **Client Disconnection**: Clean handling of streaming connection drops

## Development

### Code Structure
- **TypeScript**: Full TypeScript support with strict type checking
- **ESLint**: Code linting for consistency
- **Jest**: Unit testing framework
- **Nodemon**: Development server with hot reload

### Adding New LLM Providers
1. Implement the `LLMClient` interface in `src/ai/llm_client.ts`
2. Add the provider to the `LLMProvider` type in `src/ai/types.ts`
3. Update the factory function in `createLLMClient`

### Extending Functionality
- Add new validation schemas in `src/ai/types.ts`
- Implement new processing logic in `src/ai/agent.ts`
- Add new API endpoints in `src/index.ts`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper documentation
4. Add tests for new functionality
5. Submit a pull request

## License

Apache-2.0 License - see LICENSE file for details

## Support

For issues and questions:
1. Check the API documentation in `API_DOCUMENTATION.md`
2. Review the code comments for implementation details
3. Open an issue on the repository

---

**Note**: This service requires a separate proxy service running on port 5000 for web content fetching. Ensure the proxy service is running before using the news summary functionality
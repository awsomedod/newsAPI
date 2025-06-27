# News API - Intelligent News Processing Service

A sophisticated Node.js API service that uses Large Language Models (LLMs) to process, categorize, and summarize news content from multiple sources. The service provides intelligent news source suggestions, content categorization, and real-time news summarization with streaming capabilities.

**Note**: This service requires both the Node.js backend and a Python service (`app.py`) to be running simultaneously for full functionality.

## Features

- **Multi-LLM Support**: Compatible with Google Gemini and more to come later
- **Intelligent News Categorization**: Automatically categorizes news content into topics using AI
- **Real-time Streaming**: Server-Sent Events (SSE) for live news summary delivery
- **Smart Source Suggestions**: AI-powered news source recommendations based on topics and bias preferences
- **Content Processing**: Fetches and processes web content with intelligent filtering
- **HTML Content Parsing**: Python service using BeautifulSoup for efficient HTML content extraction and trimming
- **Structured Output**: Type-safe responses using Zod schema validation
- **CORS Support**: Configured for cross-origin requests from frontend applications

## Architecture

This project consists of two services:

1. **Node.js Backend** (`src/`) - Main API service handling LLM interactions, news categorization, and streaming responses
2. **Python Service** (`app.py`) - HTML content fetching and parsing service using BeautifulSoup for efficient content extraction

The Python service was implemented to handle large HTML content that exceeds token limits, using BeautifulSoup for reliable HTML parsing and content trimming. This separation was made because Python provided the simplest solution. My previous solution which kept all of the functionality in one typecript service got too complicated and wasn't working properly when trying to trim down the html response content.

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd newsAPI
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
pip install beautifulsoup4 requests flask
```

4. Set up environment variables (optional):
```bash
# Create a .env file with your API keys
GOOGLE_API_KEY=your_google_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Usage

### Development Mode

1. Start the Python HTML processing service:
```bash
python app.py
```
The Python service will start on `http://localhost:5000`

2. Start the Node.js development server with hot reload:
```bash
npm run dev
```
The Node.js server will start on `http://localhost:3001`

**Both services must be running for the news summary functionality to work properly.**

### Production Mode

1. Start the Python service:
```bash
python app.py
```

2. Build and start the Node.js production server:
```bash
npm run build
npm start
```

**Note**: The news summary endpoint requires both the Node.js backend and Python service to be running, as it relies on the Python service to fetch and parse HTML content from news sources.


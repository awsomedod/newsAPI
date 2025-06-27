import { Response } from 'express';
import { 
    LLMClient, 
    sourcesSchema, 
    Sources, 
    newsSummaryResponseItemSchema, 
    NewsSummaryResponseItem,
    Topic,
    CategorizationResponseSchema,
    CategorizationResponse 
} from "./types";

/**
 * Suggests news sources based on a given topic and bias preference
 * Uses the LLM client to search for and recommend relevant news sources
 * 
 * @param topic - The news topic to search for sources
 * @param bias - The bias preference (e.g., "liberal", "conservative", "neutral")
 * @param client - The LLM client to use for generating suggestions
 * @returns Promise resolving to a Sources object containing recommended news sources
 */
export async function suggestNewsSources(topic: string, bias: string, client: LLMClient): Promise<Sources> {
    console.log('Starting suggestNewsSources function with topic:', topic, 'and bias:', bias);
    
    const prompt: string = createSuggestionPrompt(topic, bias);
    console.log('Created suggestion prompt');
    
    const response: Sources = await client.generateTextWithSearchStructuredOutput<Sources>(prompt, sourcesSchema);
    console.log('Received response from LLM');
    
    // Filter out invalid URLs and add random IDs
    const validSources: Sources = {
        sources: response.sources.filter((source: { url: string; }) => isValidUrl(source.url))
    };
    console.log('Filtered valid sources:', validSources);
    
    // Assign random IDs to each source
    validSources.sources.forEach((source: { id: number; }) => {
        source.id = Math.floor(Math.random() * 1000000);
    });
    console.log('Added random IDs to sources');
    
    return validSources;
}

/**
 * Creates a prompt for suggesting news sources based on topic and bias
 * 
 * @param topic - The news topic to search for
 * @param bias - The bias preference for news sources
 * @returns Formatted prompt string for the LLM
 */
function createSuggestionPrompt(topic: string, bias: string): string {
    return `You are a news expert. You will suggest news sources based on the topic.

    Topic: ${topic}

    Suggest 5 valid URLs of news sources related to the topic.`;
}

/**
 * Validates if a string is a valid URL
 * 
 * @param source - The URL string to validate
 * @returns True if the string is a valid URL, false otherwise
 */
function isValidUrl(source: string): boolean {
    try {
        new URL(source);
        return true;
    } catch {
        return false;
    }
}

/**
 * Estimates the token count of a text string
 * Uses a combination of character-based and word-based estimation for accuracy
 * 
 * @param text - The text to estimate tokens for
 * @returns Estimated number of tokens
 */
function estimateTokenCount(text: string): number {
    // Method 1: Character-based estimation (1 token ≈ 4 characters)
    const charBasedEstimate = Math.ceil(text.length / 4);

    // Method 2: Word-based estimation (1 token ≈ 0.75 words)
    const wordCount = text.trim().split(/\s+/).length;
    const wordBasedEstimate = Math.ceil(wordCount / 0.75);

    // Return the average of both methods for better accuracy
    return Math.round((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Provides news summaries by processing multiple sources and categorizing content
 * This is the main function that orchestrates the news processing pipeline:
 * 1. Fetches content from provided URLs
 * 2. Categorizes content into topics using LLM
 * 3. Generates summaries for each topic
 * 4. Streams results to the client via Server-Sent Events
 * 
 * @param sources - Array of URLs to fetch news content from
 * @param client - The LLM client to use for processing
 * @param response - Express response object for streaming results
 * @returns Promise that resolves when all processing is complete
 */
export async function provideNews(sources: string[], client: LLMClient, response: Response): Promise<void> {
    try {
        console.log('Starting provideNews function with sources:', sources);
        
        // Fetch HTML content from all provided sources
        const HTMLcontent: {url: string, content: string}[] = await Promise.all(
            sources.map(async (url) => ({
                url,
                content: await fetchWebpage(url)
            }))
        );
        console.log('Fetched HTML content from all sources');

        // Initialize persistent memory to track topics across content items
        const persistentMemory: Topic[] = [];
        console.log('Initialized empty persistentMemory');

        // Process each content item and categorize it into topics
        for (const contentItem of HTMLcontent) {
            console.log('Processing content from URL:', contentItem.url);
            
            const prompt: string = createCategorizationPrompt(persistentMemory, contentItem.content);
            console.log('Created categorization prompt');
            
            const categorizationResponse: CategorizationResponse = await client.generateStructuredOutput<CategorizationResponse>(
                prompt, 
                CategorizationResponseSchema
            );
            console.log('Received categorization response from LLM');

            // Skip processing if no valid assignments or if content should be skipped
            if (!categorizationResponse || !categorizationResponse.assignments || 
                categorizationResponse.assignments.length === 0 || Boolean(categorizationResponse.skip)) {
                console.log('--------------------------------======================--------------------------------');
                console.log(categorizationResponse);
                console.log('No valid assignments received, skipping content item');
                console.log('Skipping content item:', contentItem.url);
                continue;
            }

            // Filter out invalid URLs from further readings
            categorizationResponse.assignments.map(assignment => {
                assignment.furtherReadings = assignment.furtherReadings?.filter(url => isValidUrl(url));
            });
            console.log('Filtered invalid URLs from further readings');

            console.log('Processing assignments:', categorizationResponse.assignments);

            // Process each topic assignment
            for (const assignment of categorizationResponse.assignments) {
                console.log('Processing assignment for topic:', assignment.topicName);
                const { topicName, isNew, furtherReadings } = assignment;

                // Skip invalid topic names
                if (!topicName || topicName.trim() === "") {
                    console.log('Invalid topic name, skipping assignment');
                    continue;
                }

                // Find existing topic with case-insensitive matching
                let topic = persistentMemory.find(t => t.name.toLowerCase() === topicName.toLowerCase());
                console.log('Found existing topic?', !!topic);

                if (isNew) {
                    // Handle new topic creation
                    if (topic) {
                        console.log('LLM suggested new topic but found existing one with same name');
                        // LLM suggested creating a new topic, but one with the same name already exists.
                        // We'll treat this as adding to the existing topic.
                        if (!topic.sources.includes(contentItem.url)) {
                            topic.sources.push(contentItem.url);
                            console.log('Added new source to existing topic');
                        } else {
                            console.log('Source already exists in topic');
                        }
                        
                        // Add furtherReadings to existing topic if provided
                        if (furtherReadings && furtherReadings.length > 0) {
                            console.log('Processing further readings for existing topic');
                            for (const url of furtherReadings) {
                                if (!topic.sources.includes(url)) {
                                    topic.sources.push(url);
                                    console.log('Added further reading URL to topic:', url);
                                }
                            }
                        }
                    } else {
                        console.log('Creating new topic:', topicName);
                        // Create new topic
                        const sources = [contentItem.url];
                        
                        // Add furtherReadings to new topic if provided
                        if (furtherReadings && furtherReadings.length > 0) {
                            console.log('Adding further readings to new topic');
                            sources.push(...furtherReadings);
                        }
                        
                        const newTopic: Topic = {
                            name: topicName,
                            sources: sources
                        };
                        persistentMemory.push(newTopic);
                        console.log('New topic created and added to persistentMemory');
                    }
                } else {
                    // Handle existing topic assignment
                    if (topic) {
                        console.log('Adding to existing topic:', topicName);
                        // Categorize into existing topic
                        if (!topic.sources.includes(contentItem.url)) {
                            topic.sources.push(contentItem.url);
                            console.log('Added new source to topic');
                        }
                        
                        // Add furtherReadings to existing topic if provided
                        if (furtherReadings && furtherReadings.length > 0) {
                            console.log('Processing further readings for existing topic');
                            for (const url of furtherReadings) {
                                if (!topic.sources.includes(url)) {
                                    topic.sources.push(url);
                                    console.log('Added further reading URL:', url);
                                }
                            }
                        }
                    } else {
                        console.log('LLM indicated existing topic but not found, creating new:', topicName);
                        // LLM said it's existing, but we couldn't find it.
                        // This could be an LLM error or a slight naming mismatch it didn't intend as new.
                        // Safest to create it as new, or you could add more sophisticated fuzzy matching.
                        const sources = [contentItem.url];
                        
                        // Add furtherReadings to new topic if provided
                        if (furtherReadings && furtherReadings.length > 0) {
                            console.log('Adding further readings to new topic');
                            sources.push(...furtherReadings);
                        }
                        
                        const newTopic: Topic = {
                            name: topicName,
                            sources: sources
                        };
                        persistentMemory.push(newTopic);
                        console.log('Created new topic due to missing reference');
                    }
                }
            }
        }

        // Generate summaries for all topics and stream them to the client
        const newsSummaryResponseItemArray: NewsSummaryResponseItem[] = [];
        console.log('Starting summary generation for all topics');
        
        for (const topic of persistentMemory) {
            console.log('Generating summary for topic:', topic.name);
            
            // Fetch HTML content for all sources in this topic
            const relevantHTMLContent: string[] = await Promise.all(
                topic.sources.map((source) => fetchWebpage(source))
            );
            console.log('Fetched HTML content for all sources in topic');
            
            const summaryPrompt: string = createSummaryPrompt(topic.name, relevantHTMLContent);
            console.log('Created summary prompt');
            
            const summaryStream: NewsSummaryResponseItem = await client.generateStructuredOutput(
                summaryPrompt, 
                newsSummaryResponseItemSchema
            );
            console.log('Received summary from LLM');
            
            // Assign a random ID to the summary
            summaryStream.id = Math.floor(Math.random() * 1000000);
            
            console.log('--------------------------------');
            console.log(topic.name);
            console.log(topic.sources);
            console.log(summaryStream.summary);
            console.log(summaryStream.image);

            // Stream the summary to the client using Server-Sent Events
            const summaryStreamString = `data: ${JSON.stringify(summaryStream)}\n\n`;
            response.write(summaryStreamString);
            console.log('Sent summary to client');
        }
    } catch (error) {
        console.error('Error generating news summary:', error);
        response.end();
    } finally {
        console.log('All summaries sent. Closing connection.');
        response.end();
    }
}

/**
 * Fetches webpage content from a local proxy service
 * The proxy service handles CORS and content extraction
 * 
 * @param url - The URL to fetch content from
 * @returns Promise resolving to the HTML content or null if failed
 */
async function fetchWebpage(url: string): Promise<string | null> {
    try {
        const response = await fetch(`http://localhost:5000/fetch-filtered-page?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
            console.error(`Error fetching webpage: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        return data.content_html || null;
    } catch (error) {
        console.error(`Error fetching webpage from ${url}:`, error);
        return null;
    }
}

/**
 * Creates a prompt for categorizing news content into topics
 * The prompt includes existing topics and guidelines for categorization
 * 
 * @param persistentMemory - Array of existing topics
 * @param content - The content to categorize
 * @returns Formatted prompt string for the LLM
 */
function createCategorizationPrompt(persistentMemory: Topic[], content: string): string {
    const existingTopics = persistentMemory.length > 0 
        ? `\n\nCurrent topics:\n${persistentMemory.map((topic) => `${topic.name}`).join('\n')}`
        : '\n\nNo existing topics yet.';

    const prompt = `You are a news categorization expert. You will be given a single news article and a list of existing topics.

Here is the content to categorize:
${content}

=========================

Here is the list of existing topics:
${existingTopics}

First, analyze if this content is about technical issues, webpage loading errors, API responses, HTML issues or other non-newsworthy technical content. If it is, return { "skip": true }.

Otherwise, analyze the content and categorize it appropriately. You should return an array of topic assignments where each assignment contains:

1. **topicName**: The name of the topic (either an existing topic name or a new topic name you're creating)
2. **isNew**: A boolean indicating whether this is a new topic (true) or an existing topic (false)
3. **furtherReadings**: (optional) An array of URLs to complete articles related to this topic (if available in the content)

Guidelines:
- If the content fits an existing topic, use that topic's exact name and set isNew to false
- If the content doesn't fit any existing topics, you can create one or more new topic names and set isNew to true for each
- You can assign the content to multiple topics if it covers multiple subjects (including a mix of existing and new topics)
- Ensure topic names are clear, descriptive, and unique
- Use exact topic names from the existing list when categorizing into existing topics
- When creating new topics, ensure they are distinct and don't overlap with each other
- For each topic assignment, extract any relevant URLs from the content that link to complete articles about that topic
- The furtherReadings URLs should be direct links to full articles, not homepages or category pages
- Limit furtherReadings to a maximum of 3 URLs per topic assignment to ensure the most newsworthy and relevant links are prioritized
- Limit the total number of topic assignments to a maximum of 5 to ensure the most relevant topics are prioritized
- If no relevant article links are found for a topic, you can omit the furtherReadings field or set it to an empty array

Your response should be a JSON object with either:
1. { "skip": true } for technical/error content
2. { "skip": false, "assignments": [...] } for newsworthy content
`;
    return prompt;
}

/**
 * Creates a prompt for generating news summaries
 * The prompt includes the topic name and content from multiple sources
 * 
 * @param category - The topic/category name
 * @param relevantHTMLContent - Array of HTML content from relevant sources
 * @returns Formatted prompt string for the LLM
 */
function createSummaryPrompt(category: string, relevantHTMLContent: string[]): string {
    const indexedSources = relevantHTMLContent.map((content, index) => {
        return `Source ${index}:\n${content}`;
    }).join('\n\n------------\n\n');

    const summaryLength = '50 words';

    const prompt = `You are a world-class news summarizer. You will be provided with a topic name and content from multiple news sources related to that topic.

Please provide a comprehensive summary of the news events for this topic. The summary should be detailed and ${summaryLength} long.

Here is the content from the different news sources, separated by '------------':
${indexedSources}

Your output should be a summary of the news articles in the following category: ${category}. The summary should be detailed and between 400 and 500 words long.

Also, provide select a relevant image for the summary from the urls in the content. Also provide a title for the summary. Also provide a unique id for the summary.

Your output should be a JSON object with the following fields:
- id: number
- title: string
- summary: string
- image: string
`;
    return prompt;
}


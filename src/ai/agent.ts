import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import { LLMClient, 
    sourcesSchema, 
    Sources, 
    newsSummaryResponseItemSchema, 
    NewsSummaryResponseItem,
    Topic,
    CategorizationResponseSchema,
    CategorizationResponse } from "./types";

export async function suggestNewsSources(topic: string, bias: string, client: LLMClient): Promise<Sources> {
    const prompt: string = createSuggestionPrompt(topic, bias);
    const response: Sources = await client.generateTextWithSearchStructuredOutput<Sources>(prompt, sourcesSchema);
    const validSources : Sources = {sources: response.sources.filter((source: { url: string; }) => isValidUrl(source.url))};
    validSources.sources.forEach((source: { id: number; }) => {
        source.id = Math.floor(Math.random() * 1000000);
    });
    return validSources;
}

function createSuggestionPrompt(topic: string, bias: string) {
    return `You are a news expert. You will suggest news sources based on the topic.

    Topic: ${topic}

    Suggest 5 valid URLs of news sources related to the topic.`;
}

function isValidUrl(source: string): boolean {
    try {
      new URL(source);
      return true;
    } catch {
      return false;
    }
  }

function estimateTokenCount(text: string): number {
    // Method 1: Character-based estimation (1 token ≈ 4 characters)
    const charBasedEstimate = Math.ceil(text.length / 4);

    // Method 2: Word-based estimation (1 token ≈ 0.75 words)
    const wordCount = text.trim().split(/\s+/).length;
    const wordBasedEstimate = Math.ceil(wordCount / 0.75);

    // Return the average of both methods for better accuracy
    return Math.round((charBasedEstimate + wordBasedEstimate) / 2);
}

export async function provideNews(sources: string[], client: LLMClient): Promise<NewsSummaryResponseItem[]> {
    const HTMLcontent: {url: string, content: string}[] = await Promise.all(
        sources.map(async (url) => ({
            url,
            content: await fetchWebpage(url)
        }))
    );


    const persistentMemory: Topic[] = [];

    for (const contentItem of HTMLcontent) { // Renamed 'content' to 'contentItem' for clarity
        const prompt: string = createCategorizationPrompt(persistentMemory, contentItem.content);
        // Ensure categorizationResponseSchema is updated for the new CategorizationResponse structure
        const response: CategorizationResponse = await client.generateStructuredOutput<CategorizationResponse>(prompt, CategorizationResponseSchema);

        if (!response || !response.assignments || response.assignments.length === 0) {
            continue;
        }

        response.assignments.map(assignment => {
            assignment.furtherReadings = assignment.furtherReadings?.filter(url => isValidUrl(url));
        });

        for (const assignment of response.assignments) {
            const { topicName, isNew, furtherReadings } = assignment;

            if (!topicName || topicName.trim() === "") {
                continue;
            }

            let topic = persistentMemory.find(t => t.name.toLowerCase() === topicName.toLowerCase());

            if (isNew) {
                if (topic) {
                    // LLM suggested creating a new topic, but one with the same name already exists.
                    // We'll treat this as adding to the existing topic.
                    if (!topic.sources.includes(contentItem.url)) {
                        topic.sources.push(contentItem.url);
                    } else {
                    }
                    
                    // Add furtherReadings to existing topic if provided
                    if (furtherReadings && furtherReadings.length > 0) {
                        for (const url of furtherReadings) {
                            if (!topic.sources.includes(url)) {
                                topic.sources.push(url);
                            }
                        }
                    }
                } else {
                    // Create new topic
                    const sources = [contentItem.url];
                    
                    // Add furtherReadings to new topic if provided
                    if (furtherReadings && furtherReadings.length > 0) {
                        sources.push(...furtherReadings);
                    }
                    
                    const newTopic: Topic = {
                        name: topicName,
                        sources: sources
                    };
                    persistentMemory.push(newTopic);
                }
            } else { // isNew is false, LLM suggests it's an existing topic
                if (topic) {
                    // Categorize into existing topic
                    if (!topic.sources.includes(contentItem.url)) {
                        topic.sources.push(contentItem.url);
                    }
                    
                    // Add furtherReadings to existing topic if provided
                    if (furtherReadings && furtherReadings.length > 0) {
                        for (const url of furtherReadings) {
                            if (!topic.sources.includes(url)) {
                                topic.sources.push(url);
                            }
                        }
                    }
                } else {
                    // LLM said it's existing, but we couldn't find it.
                    // This could be an LLM error or a slight naming mismatch it didn't intend as new.
                    // Safest to create it as new, or you could add more sophisticated fuzzy matching.
                    const sources = [contentItem.url];
                    
                    // Add furtherReadings to new topic if provided
                    if (furtherReadings && furtherReadings.length > 0) {
                        sources.push(...furtherReadings);
                    }
                    
                    const newTopic: Topic = {
                        name: topicName,
                        sources: sources
                    };
                    persistentMemory.push(newTopic);
                }
            }
        }
    }


    
    for (const topic of persistentMemory) {
        const tokenCounts = await Promise.all(topic.sources.map(async (source) => estimateTokenCount(await fetchWebpage(source))));
        console.log(tokenCounts.reduce((a, b) => a + b, 0));
    }

    const newsSummaryResponseItemArray: NewsSummaryResponseItem[] = [];
    
    for (const topic of persistentMemory) {
        // console.log('Waiting for 20 seconds...');
        // for (let i = 1; i <= 20; i++) {
        //     console.log(`Second ${i}`);
        //     await new Promise(resolve => setTimeout(resolve, 1000));
        // }
        console.log('--------------------------------');
        console.log(topic.name);
        console.log(topic.sources);
        const relevantHTMLContent: string[] = await Promise.all(topic.sources.map((source) => fetchWebpage(source)));
        const summaryPrompt: string = createSummaryPrompt(topic.name, relevantHTMLContent);
        const summaryStream: NewsSummaryResponseItem = await client.generateStructuredOutput(summaryPrompt, newsSummaryResponseItemSchema);
        process.stdout.write(summaryStream.id.toString());
        process.stdout.write(summaryStream.title);
        process.stdout.write(summaryStream.summary);
        process.stdout.write(summaryStream.image);

        newsSummaryResponseItemArray.push(summaryStream);

        console.log('\n');
    }

    // Reroll IDs for each item in the array
    for (let i = 0; i < newsSummaryResponseItemArray.length; i++) {
        newsSummaryResponseItemArray[i].id = Math.floor(Math.random() * 1000000);
    }

    return newsSummaryResponseItemArray;
}

async function fetchWebpage(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const html = await response.text();
    
        // 1. Create a virtual DOM using JSDOM with CSS parsing disabled
        // We pass the URL as the second argument to JSDOM so it can correctly
        // resolve relative URLs for links and images.
        // We disable CSS parsing to avoid errors from malformed CSS
        const dom = new JSDOM(html, { 
            url,
            runScripts: "outside-only",
            resources: "usable",
            includeNodeLocations: false
        });
    
        // 2. Use Readability to extract the main article content
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        return article.content;
    } catch (error: any) {
        return `Error processing ${url}`;
    }    
}



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

Please analyze this content and categorize it appropriately. You should return an array of topic assignments where each assignment contains:

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
- If no relevant article links are found for a topic, you can omit the furtherReadings field or set it to an empty array

Your response should be a JSON object with an "assignments" array containing topic assignments.`;
    return prompt;
}

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

Also, provide select a relevant image for the summary from the urls in the content. Also provide a title for the summary. Also provvide a unique id for the summary.

Your output should be a JSON object with the following fields:
- id: number
- title: string
- summary: string
- image: string
`;
    return prompt;
}


import { LLMClient, 
    sourcesSchema, 
    Sources, 
    categoriesSchema, 
    Categories, 
    newsSummaryResponseItemSchema, 
    NewsSummaryResponseItem,
    PersistentMemory,
    Topic } from "./types";

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

    const persistentMemory: PersistentMemory = {topics: []};

    for (const content of HTMLcontent) {
        const prompt: string = createCategorizationPrompt(persistentMemory, content.content);
        const response: Categories = await client.generateStructuredOutput<Categories>(prompt, categoriesSchema);
        persistentMemory.push(response.categoryArray[0].category);
    }

    const prompt: string = createCategorizationPrompt(HTMLcontent);
    console.log('\n\ntesting categorization prompt \n\n');
    console.log(estimateTokenCount(prompt));
    console.log('\n\n');
    const response: Categories = await client.generateStructuredOutput<Categories>(prompt, categoriesSchema);
    
    for (const category of response.categoryArray) {
        console.log('--------------------------------');
        console.log(category.category);
        console.log(category.sources);
    }

    const newsSummaryResponseItemArray: NewsSummaryResponseItem[] = [];
    
    for (const category of response.categoryArray) {
        // console.log('Waiting for 20 seconds...');
        // for (let i = 1; i <= 20; i++) {
        //     console.log(`Second ${i}`);
        //     await new Promise(resolve => setTimeout(resolve, 1000));
        // }
        console.log('--------------------------------');
        console.log(category.category);
        console.log(category.sources);
        const relevantHTMLContent: string[] = HTMLcontent.filter((content, index) => category.sources.includes(index));
        const summaryPrompt: string = createSummaryPrompt(category.category, relevantHTMLContent);
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
      const text = await response.text();
      return text;
    } catch (error: any) {
      return `Error fetching ${url}: ${error.message}`;
    }
}



function createCategorizationPrompt(persistentMemory: PersistentMemory, content: string): string {
    
    const existingTopics = persistentMemory.topics.length > 0 
        ? `\n\nCurrent topics:\n${persistentMemory.topics.map((topic) => `${topic.name}`).join('\n')}`
        : '\n\nNo existing topics yet.';

    const prompt = `You are a news categorization expert. You will be given a single news article and a list of existing topics.

Here is the content to categorize:
${content}


=========================

Here is the list of existing topics:
${existingTopics}

Please analyze this content and take one of the following actions:

1. **Categorize into existing topic**: If the content fits an existing topic, specify the topic number and optionally suggest a better name for that topic.

2. **Categorize into existing topic with rename**: If the content fits an existing topic but you think the topic name should be changed, specify the topic number and provide a new name.

3. **Create new topic**: If the content doesn't fit any existing topics, create a new topic name.

Your response should be in this format:
- Action: [1, 2, or 3] Just respond with the number of the action you want to take. (1: Categorize into existing topic, 2: Categorize into existing topic with rename, 3: Create new topic)
- Topic Name: [existing topic name if choice 1, old topic name if choice 2, empty string if choice 3]
- New Topic Name: [new topic name if choice 2, new topic name if choice 3]


Ensure that the topics will be unique and not similar to each other.
`;
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


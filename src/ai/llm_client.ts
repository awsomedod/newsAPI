import { googleAI } from '@genkit-ai/googleai';
import { genkit, Genkit } from 'genkit';
import { config } from 'dotenv';
import { ZodSchema } from 'zod';
import { LLMClient, LLMConfig } from './types';


config();
const GoogleModel: Set<string> = new Set(['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash-preview-05-20']);



export class MockClient implements LLMClient {
  constructor(private config: LLMConfig){}
  async generateText(prompt: string): Promise<string> {
    return `This is a mock response for model ${this.config.model} to the promptsgsg: ${prompt}`;
  }

  async generateStructuredOutput<T>(prompt: string): Promise<T> {
    const mockResponse = {
      message: `This is a mock structured response for model ${this.config.model}`,
      prompt: prompt,
    };
    return mockResponse as T;
  }

  async *streamText(prompt: string): AsyncGenerator<string> {
    const response = `This is a mock stream response for model ${this.config.model} to the prompt: ${prompt}`;
    for (const word of response.split(' ')) {
      yield word + ' ';
      // simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

export class GoogleGenAIClient implements LLMClient {
  private client: Genkit;
  
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
  }
  
    
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    if (systemPrompt) {
      const { text } = await this.client.generate({system: systemPrompt, prompt: prompt});
      return text;
    } else {
      const { text } = await this.client.generate({prompt: prompt});
      return text;
    }
  }

  async generateStructuredOutput<T>(prompt: string, schema: ZodSchema): Promise<T> {
    const result = await this.client.generate({
        prompt: prompt,
        output: { schema: schema}
    });

    const responseText = await result.text;
    return JSON.parse(responseText) as T;
  }
  

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

}

// A factory function to create the right client
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case 'mock':
        return new MockClient(config);
    case 'google':
      return new GoogleGenAIClient(config);
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




// const google_client2: LLMClient = createLLMClient({
//   provider: 'google',
//   model: 'gemini-2.0-flash-lite',
//   apiKey: "AIzaSyBt5EUJDfGsloIibeuFTA7On7YlSLQWylk",
// });


// const stream2 = google_client2.streamText('Write a 1 paragraph story about the 2020 US Presidential Election', 'You are a sims npc');

// (async () => {
//   for await (const chunk of stream2) {
//     console.log(chunk);
//   }
// })();


// (async () => {

//   const personSchema = z.object({
//     personalInfo: z.object({
//       firstName: z.string().describe('The person\'s given name'),
//       lastName: z.string().describe('The person\'s family name'),
//       middleName: z.string().optional().describe('Optional middle name'),
//       age: z.number().min(0).max(150).describe('Age in years'),
//       dateOfBirth: z.string().describe('Date of birth in YYYY-MM-DD format'),
//       gender: z.enum(['male', 'female', 'non-binary', 'other']).describe('Gender identity')
//     }).describe('Basic personal information'),
//     contact: z.object({
//       email: z.string().describe('Primary email address'),
//       phone: z.string().describe('Phone number with optional country code'),
//       address: z.object({
//         street: z.string().describe('Street address including house/apt number'),
//         city: z.string().describe('City name'),
//         state: z.string().describe('State or province'),
//         country: z.string().describe('Country name'),
//         postalCode: z.string().describe('Postal or ZIP code')
//       }).describe('Physical address')
//     }).describe('Contact information'),
//     employment: z.object({
//       currentRole: z.string().describe('Current job title'),
//       company: z.string().describe('Current employer'),
//       yearsOfExperience: z.number().min(0).describe('Years of work experience'),
//       skills: z.array(z.string()).min(1).describe('List of professional skills'),
//       salary: z.number().optional().describe('Annual salary in USD')
//     }).describe('Employment details'),
//     education: z.array(z.object({
//       degree: z.string().describe('Name of degree or certification'),
//       institution: z.string().describe('Name of educational institution'),
//       graduationYear: z.number().describe('Year of graduation'),
//       gpa: z.number().min(0).max(4).optional().describe('GPA on 4.0 scale')
//     })).describe('Educational background'),
//     preferences: z.object({
//       languages: z.array(z.string()).min(10).describe('Languages spoken'),
//       interests: z.array(z.string()).describe('Personal interests and hobbies'),
//       dietaryRestrictions: z.array(z.string()).optional().describe('Dietary restrictions if any'),
//       communicationPreferences: z.enum(['email', 'phone', 'text']).describe('Preferred contact method')
//     }).describe('Personal preferences')
//   });

//   type Person = z.infer<typeof personSchema>;

//   try {
//     const person = await google_client2.generateStructuredOutput<Person>("Given a Person Schema, create a Person object", personSchema);
//     console.log('Structured output:');
//     console.log(person);
//   } catch(e) {
//     console.error(e);
//   }
// })();



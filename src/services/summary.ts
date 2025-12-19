import OpenAI from 'openai';
import { config } from '../config';
import { ActivityData } from './aggregation';
import { buildSummaryPrompt } from './prompts';

const MODEL_VERSION = 'gpt-5-mini-2025-08-07';

export class SummaryService {
  private openai: OpenAI;

  constructor() {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async generateSummary(data: ActivityData): Promise<string> {
    const prompt = buildSummaryPrompt(data);

    try {
      const response = await this.openai.chat.completions.create({
        model: MODEL_VERSION,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert engineering manager assistant that creates clear, factual, and professional summaries of software development activity.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 2000,
      });

      let summary = response.choices[0]?.message?.content;

      if (!summary) {
        throw new Error('No summary generated from OpenAI');
      }

      // Strip markdown code fences if present
      summary = summary.trim();
      const codeBlockRegex = /^```(?:markdown)?\n([\s\S]*?)\n```$/;
      const match = summary.match(codeBlockRegex);
      if (match) {
        summary = match[1].trim();
      }

      return summary;
    } catch (error) {
      console.error('Error generating summary with OpenAI:', error);
      throw new Error('Failed to generate AI summary');
    }
  }

  getModelVersion(): string {
    return MODEL_VERSION;
  }
}

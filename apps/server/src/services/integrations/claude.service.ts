import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';

const client = new Anthropic({
  apiKey: config.anthropic.apiKey,
  ...(config.anthropic.baseUrl ? { baseURL: config.anthropic.baseUrl } : {})
});

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function streamChatCompletion(
  systemPrompt: string,
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  model = 'claude-sonnet-4-6'
): Promise<void> {
  const stream = await client.messages.stream({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      onChunk(chunk.delta.text);
    }
  }
  onDone();
}

export async function chatCompletion(
  systemPrompt: string,
  messages: Message[],
  model = 'claude-haiku-4-5-20251001'
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

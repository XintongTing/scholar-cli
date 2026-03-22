import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import * as appConfigRepo from '../../repositories/app-config.repository.js';
import type { AppConfigRow } from '../../repositories/app-config.repository.js';

const AI_CONFIG_KEYS = ['anthropic.apiKey', 'anthropic.baseUrl'] as const;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CallMeta {
  nodeName: string;
  projectId?: string;
  userId?: string;
}

interface RuntimeAnthropicConfig {
  apiKey: string;
  baseUrl: string;
}

async function getRuntimeAnthropicConfig(): Promise<RuntimeAnthropicConfig> {
  const rows = await appConfigRepo.findMany([...AI_CONFIG_KEYS]);

  const map = new Map(rows.map((row: AppConfigRow) => [row.key, row.value]));
  return {
    apiKey: map.get('anthropic.apiKey') || config.anthropic.apiKey,
    baseUrl: map.get('anthropic.baseUrl') || config.anthropic.baseUrl,
  };
}

function createClient(runtimeConfig: RuntimeAnthropicConfig) {
  return new Anthropic({
    apiKey: runtimeConfig.apiKey,
    ...(runtimeConfig.baseUrl ? { baseURL: runtimeConfig.baseUrl } : {}),
    timeout: 120_000,
    maxRetries: 0,
  });
}

function shouldUseCompatApi(runtimeConfig: RuntimeAnthropicConfig) {
  return Boolean(runtimeConfig.baseUrl);
}

function getCompatBaseUrl(runtimeConfig: RuntimeAnthropicConfig) {
  return runtimeConfig.baseUrl.replace(/\/$/, '');
}

async function createCompatMessage(
  runtimeConfig: RuntimeAnthropicConfig,
  systemPrompt: string,
  messages: Message[],
  model: string,
  maxTokens: number,
  stream: boolean
) {
  const response = await fetch(`${getCompatBaseUrl(runtimeConfig)}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': runtimeConfig.apiKey,
      ...(stream ? { accept: 'text/event-stream' } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      stream,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`${response.status} ${response.statusText || 'AI request failed'}${body ? `: ${body}` : ''}`) as Error & {
      status?: number;
      error?: string;
    };
    error.status = response.status;
    error.error = body;
    throw error;
  }

  return response;
}

async function streamCompatMessage(
  runtimeConfig: RuntimeAnthropicConfig,
  systemPrompt: string,
  messages: Message[],
  onChunk: (text: string) => void,
  model: string
) {
  const response = await createCompatMessage(runtimeConfig, systemPrompt, messages, model, 8192, true);
  if (!response.body) throw new Error('Empty streaming response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const payloads = part
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6))
        .filter((line) => line && line !== '[DONE]');

      for (const payload of payloads) {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
          message?: { usage?: { input_tokens?: number; output_tokens?: number } };
          usage?: { input_tokens?: number; output_tokens?: number };
        };

        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const text = event.delta.text ?? '';
          output += text;
          onChunk(text);
        }

        if (event.type === 'message_start' && event.message?.usage) {
          inputTokens = event.message.usage.input_tokens ?? 0;
          outputTokens = event.message.usage.output_tokens ?? 0;
        }

        if (event.type === 'message_delta' && event.usage) {
          inputTokens = event.usage.input_tokens ?? inputTokens;
          outputTokens = event.usage.output_tokens ?? outputTokens;
        }
      }
    }
  }

  return { output, inputTokens, outputTokens };
}

async function completeCompatMessage(
  runtimeConfig: RuntimeAnthropicConfig,
  systemPrompt: string,
  messages: Message[],
  model: string
) {
  const response = await createCompatMessage(runtimeConfig, systemPrompt, messages, model, 4096, false);
  const json = await response.json() as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const output = (json.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');

  return {
    output,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
  };
}

export async function streamChatCompletion(
  systemPrompt: string,
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void | Promise<void>,
  model = 'claude-haiku-4-5-20251001',
  meta?: CallMeta
): Promise<void> {
  const startMs = Date.now();
  const runtimeConfig = await getRuntimeAnthropicConfig();
  const client = createClient(runtimeConfig);
  let output = '';
  let inputTokens = 0;
  let outputTokens = 0;

  if (shouldUseCompatApi(runtimeConfig)) {
    ({ output, inputTokens, outputTokens } = await streamCompatMessage(runtimeConfig, systemPrompt, messages, onChunk, model));
  } else {
    const stream = await client.messages.stream({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages.map((message) => ({ role: message.role, content: message.content }))
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        output += chunk.delta.text;
        onChunk(chunk.delta.text);
      }
      if (chunk.type === 'message_delta' && chunk.usage) {
        outputTokens = chunk.usage.output_tokens ?? 0;
      }
      if (chunk.type === 'message_start' && chunk.message.usage) {
        inputTokens = chunk.message.usage.input_tokens ?? 0;
      }
    }
  }

  await onDone();

  if (meta?.nodeName) {
    prisma.aiCallLog.create({
      data: {
        nodeName: meta.nodeName,
        systemPrompt,
        messages: messages as object[],
        output,
        projectId: meta.projectId ?? null,
        userId: meta.userId ?? null,
        durationMs: Date.now() - startMs,
        inputTokens,
        outputTokens,
      }
    }).catch(() => {});
  }
}

export async function chatCompletion(
  systemPrompt: string,
  messages: Message[],
  model = 'claude-haiku-4-5-20251001',
  meta?: CallMeta
): Promise<string> {
  const startMs = Date.now();
  const runtimeConfig = await getRuntimeAnthropicConfig();
  const client = createClient(runtimeConfig);
  let output = '';
  let inputTokens = 0;
  let outputTokens = 0;

  if (shouldUseCompatApi(runtimeConfig)) {
    ({ output, inputTokens, outputTokens } = await completeCompatMessage(runtimeConfig, systemPrompt, messages, model));
  } else {
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((message) => ({ role: message.role, content: message.content }))
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        output += chunk.delta.text;
      }
      if (chunk.type === 'message_start' && chunk.message.usage) {
        inputTokens = chunk.message.usage.input_tokens ?? 0;
      }
      if (chunk.type === 'message_delta' && chunk.usage) {
        outputTokens = chunk.usage.output_tokens ?? 0;
      }
    }
  }

  if (meta?.nodeName) {
    prisma.aiCallLog.create({
      data: {
        nodeName: meta.nodeName,
        systemPrompt,
        messages: messages as object[],
        output,
        projectId: meta.projectId ?? null,
        userId: meta.userId ?? null,
        durationMs: Date.now() - startMs,
        inputTokens,
        outputTokens,
      }
    }).catch(() => {});
  }

  return output;
}

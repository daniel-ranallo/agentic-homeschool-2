/**
 * LLM Provider Adapter
 *
 * Auto-detects available models from DGX Spark endpoint and creates
 * chat model instances. Supports caching to reduce API overhead.
 *
 * @module llm-adapter
 */

import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LLM_ENDPOINT } from './utils';

/** Model information structure */
export interface ModelInfo {
  /** Unique model identifier */
  id: string;
  /** Human-readable model name */
  name: string;
  /** Whether the model is currently available */
  available: boolean;
}

/** Cache for available models with TTL */
let availableModels: ModelInfo[] = [];
let lastCheckTime: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache duration

/**
 * Detect available models from the DGX Spark endpoint.
 * Results are cached for 5 minutes to reduce API overhead.
 *
 * @returns Array of available model information
 */
export async function detectAvailableModels(): Promise<ModelInfo[]> {
  const now = Date.now();

  // Return cached results if still valid
  if (availableModels.length > 0 && (now - lastCheckTime) < CACHE_TTL_MS) {
    return availableModels;
  }

  try {
    const response = await fetch(`${LLM_ENDPOINT}/v1/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`LLM endpoint returned ${response.status}, using default models`);
      availableModels = getDefaultModels();
      lastCheckTime = now;
      return availableModels;
    }

    const data = await response.json();
    const models = data.data || data || [];

    availableModels = models.map((m: { id?: string; name?: string }) => ({
      id: m.id || m.name || 'unknown',
      name: m.name || m.id || 'Unknown Model',
      available: true,
    }));

    if (availableModels.length === 0) {
      availableModels = getDefaultModels();
    }

    lastCheckTime = now;
    return availableModels;
  } catch (error) {
    console.error('Failed to detect LLM models:', error instanceof Error ? error.message : error);
    availableModels = getDefaultModels();
    return availableModels;
  }
}

/**
 * Get default fallback models when detection fails.
 * These are known working models for the DGX Spark environment.
 */
function getDefaultModels(): ModelInfo[] {
  return [
    { id: 'qwen', name: 'Qwen3.5', available: true },
    { id: 'claude-sonnet-4-8', name: 'Claude Sonnet 4.8', available: true },
  ];
}

/**
 * Get the best available model, prioritizing Qwen for DGX Spark.
 *
 * Priority order:
 * 1. Qwen models (native to DGX Spark)
 * 2. Claude models
 * 3. First available model as fallback
 *
 * @returns The selected model ID
 */
export async function getAvailableModel(): Promise<string> {
  const models = await detectAvailableModels();

  // Prefer Qwen models (optimized for DGX Spark)
  const qwenModel = models.find(m => m.id.toLowerCase().includes('qwen'));
  if (qwenModel) {
    return qwenModel.id;
  }

  // Fallback to Claude models
  const claudeModel = models.find(m => m.id.includes('claude') || m.name.includes('Claude'));
  if (claudeModel) {
    return claudeModel.id;
  }

  // Last resort: first available model
  return models[0]?.id || 'qwen';
}

/**
 * Create a chat model instance with auto-detected model selection.
 *
 * @param modelName - Optional specific model to use; auto-detected if omitted
 * @returns Configured chat model instance
 */
export async function createChatModel(modelName?: string): Promise<BaseChatModel> {
  const modelId = modelName || await getAvailableModel();

  const model = new ChatOpenAI({
    modelName: modelId,
    openAIApiKey: 'not-needed',
    configuration: {
      baseURL: `${LLM_ENDPOINT}/v1`,
    },
    temperature: 0.7,
  });

  // Silently test connectivity (non-blocking)
  fetch(`${LLM_ENDPOINT}/v1/models`, { method: 'GET', signal: AbortSignal.timeout(5000) })
    .then(res => res.ok && console.log(`LLM endpoint accessible: ${LLM_ENDPOINT}`))
    .catch(() => console.warn(`LLM endpoint not reachable: ${LLM_ENDPOINT}`));

  return model;
}

/**
 * Configuration options for creating a chat model.
 */
export interface CreateChatModelOptions {
  /** Optional model name override */
  modelName?: string;
  /** Temperature for generation (0-1), default 0.7 */
  temperature?: number;
  /** Enable streaming, default true */
  streaming?: boolean;
}

/**
 * Create a chat model with specific configuration options.
 *
 * @param options - Configuration options
 * @returns Configured chat model instance
 */
export function createChatModelConfigured(
  options: CreateChatModelOptions = {}
): Promise<BaseChatModel> {
  const { modelName, temperature = 0.7, streaming = true } = options;

  return createChatModel(modelName).then(model => {
    const chatModel = model as ChatOpenAI;
    chatModel.temperature = temperature;
    chatModel.streaming = streaming;
    return model;
  });
}

/**
 * Refresh the model cache by clearing and re-fetching available models.
 * Useful when model availability may have changed.
 *
 * @returns Updated list of available models
 */
export async function refreshModelCache(): Promise<ModelInfo[]> {
  availableModels = [];
  lastCheckTime = 0;
  return detectAvailableModels();
}

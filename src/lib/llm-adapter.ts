/**
 * LLM Provider Adapter
 * Auto-detects available models from DGX Spark endpoint
 * Supports both OpenAI and Anthropic API formats
 */

import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

const LLM_ENDPOINT = process.env.LLM_ENDPOINT || 'http://spark.ranallohome.com:8001';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

console.log(`[LLM Adapter] LLM_ENDPOINT: ${LLM_ENDPOINT}`);
console.log(`[LLM Adapter] LLM_PROVIDER: ${LLM_PROVIDER}`);

interface ModelInfo {
  id: string;
  name: string;
  available: boolean;
}

// Cache for available models
let availableModels: ModelInfo[] = [];
let lastCheckTime: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a model is available by trying to get its info
 */
async function checkModelAvailability(modelId: string): Promise<boolean> {
  console.log(`[LLM Adapter] Checking model availability for: ${modelId}`);
  try {
    console.log(`[LLM Adapter] Fetching models from: ${LLM_ENDPOINT}/v1/models`);
    const response = await fetch(`${LLM_ENDPOINT}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log(`[LLM Adapter] Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`[LLM Adapter] Failed to fetch models: ${response.status} ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    const models = data.data || data;

    console.log(`[LLM Adapter] Received models:`, JSON.stringify(models).substring(0, 200));

    // Check if our model is in the list
    if (Array.isArray(models)) {
      const found = models.some((m: any) => m.id === modelId || m.name === modelId);
      console.log(`[LLM Adapter] Model ${modelId} found: ${found}`);
      return found;
    }

    return true;
  } catch (error) {
    console.error(`[LLM Adapter] Error checking model ${modelId}:`, error);
    if (error instanceof Error) {
      console.error(`[LLM Adapter] Error details:`, error.message);
      if (error.message.includes('ETIMEDOUT') || error.message.includes('ENOTFOUND')) {
        console.error(`[LLM Adapter] Network error - cannot reach LLM endpoint`);
      }
    }
    return false;
  }
}

/**
 * Detect available models from the endpoint
 */
export async function detectAvailableModels(): Promise<ModelInfo[]> {
  const now = Date.now();
  if (availableModels.length > 0 && (now - lastCheckTime) < CACHE_TTL_MS) {
    console.log(`[LLM Adapter] Using cached models`);
    return availableModels;
  }

  console.log(`[LLM Adapter] Detecting available models from ${LLM_ENDPOINT}...`);

  try {
    const response = await fetch(`${LLM_ENDPOINT}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[LLM Adapter] Failed to fetch models (${response.status}), using defaults`);
      availableModels = getDefaultModels();
      lastCheckTime = now;
      return availableModels;
    }

    const data = await response.json();
    const models = data.data || data || [];

    availableModels = models.map((m: any) => ({
      id: m.id || m.name,
      name: m.name || m.id,
      available: true,
    }));

    // If no models returned, use defaults
    if (availableModels.length === 0) {
      availableModels = getDefaultModels();
    }

    console.log(`[LLM Adapter] Available models:`, availableModels.map(m => m.id).join(', '));
    lastCheckTime = now;
    return availableModels;
  } catch (error) {
    console.error('[LLM Adapter] Error detecting models:', error);
    if (error instanceof Error) {
      console.error('[LLM Adapter] Error details:', error.message);
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        console.error('[LLM Adapter] TIMEOUT - LLM endpoint did not respond in time');
      }
      if (error.message.includes('ENOTFOUND')) {
        console.error('[LLM Adapter] DNS lookup failed - cannot resolve LLM endpoint hostname');
      }
      if (error.message.includes('ECONNREFUSED')) {
        console.error('[LLM Adapter] Connection refused - LLM endpoint is not accepting connections');
      }
    }
    availableModels = getDefaultModels();
    return availableModels;
  }
}

/**
 * Get default models if detection fails
 */
function getDefaultModels(): ModelInfo[] {
  console.log('[LLM Adapter] Using default models');
  return [
    { id: 'qwen', name: 'Qwen3.5', available: true },
    { id: 'claude-sonnet-4-8', name: 'Claude Sonnet 4.8', available: true },
  ];
}

/**
 * Get the best available model
 */
export async function getAvailableModel(): Promise<string> {
  console.log('[LLM Adapter] Getting available model...');
  const models = await detectAvailableModels();

  // Try to find Qwen first (available on DGX Spark)
  const qwenModel = models.find(m =>
    m.id.toLowerCase().includes('qwen')
  );

  if (qwenModel) {
    console.log(`[LLM Adapter] Selected Qwen model: ${qwenModel.id}`);
    return qwenModel.id;
  }

  // Try to find a Claude model
  const claudeModel = models.find(m =>
    m.id.includes('claude') || m.name.includes('Claude')
  );

  if (claudeModel) {
    console.log(`[LLM Adapter] Selected Claude model: ${claudeModel.id}`);
    return claudeModel.id;
  }

  // Fallback to first available model
  const selected = models[0]?.id || 'qwen';
  console.log(`[LLM Adapter] Selected model: ${selected}`);
  return selected;
}

/**
 * Create a chat model instance with auto-detection
 */
export async function createChatModel(
  modelName?: string
): Promise<BaseChatModel> {
  const modelId = modelName || await getAvailableModel();

  console.log(`[LLM Adapter] Creating chat model: ${modelId} from ${LLM_ENDPOINT}`);

  const model = new ChatOpenAI({
    modelName: modelId,
    openAIApiKey: 'not-needed',
    configuration: {
      baseURL: `${LLM_ENDPOINT}/v1`,
    },
    temperature: 0.7,
  });

  // Test the connection
  console.log(`[LLM Adapter] Testing model connection...`);
  try {
    const testResponse = await fetch(`${LLM_ENDPOINT}/v1/models`, {
      method: 'GET',
      timeout: 5000,
    });
    console.log(`[LLM Adapter] Connection test - Status: ${testResponse.status}`);
  } catch (testError) {
    console.error('[LLM Adapter] Connection test failed:', testError);
    if (testError instanceof Error) {
      console.error('[LLM Adapter] Connection error details:', testError.message);
    }
  }

  return model;
}

/**
 * Create a chat model with specific configuration
 */
export function createChatModelConfigured(
  options: {
    modelName?: string;
    temperature?: number;
    streaming?: boolean;
  } = {}
): Promise<BaseChatModel> {
  const { modelName, temperature = 0.7, streaming = true } = options;

  return createChatModel(modelName).then(model => {
    (model as ChatOpenAI).temperature = temperature;
    (model as ChatOpenAI).streaming = streaming;
    console.log(`[LLM Adapter] Model configured: temperature=${temperature}, streaming=${streaming}`);
    return model;
  });
}

/**
 * Refresh model cache (call when model availability might have changed)
 */
export async function refreshModelCache(): Promise<ModelInfo[]> {
  console.log('[LLM Adapter] Refreshing model cache...');
  availableModels = [];
  lastCheckTime = 0;
  return detectAvailableModels();
}

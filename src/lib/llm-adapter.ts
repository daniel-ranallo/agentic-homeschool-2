/**
 * LLM Provider Adapter
 * Auto-detects available models from DGX Spark endpoint
 * Supports both OpenAI and Anthropic API formats
 */

import { ChatOpenAI } from '@langchain/openai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

const LLM_ENDPOINT = process.env.LLM_ENDPOINT || 'http://spark.ranallohome.com:8001';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

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
  try {
    const response = await fetch(`${LLM_ENDPOINT}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const models = data.data || data;

    // Check if our model is in the list
    if (Array.isArray(models)) {
      return models.some((m: any) => m.id === modelId || m.name === modelId);
    }

    return true;
  } catch (error) {
    console.error(`Error checking model ${modelId}:`, error);
    return false;
  }
}

/**
 * Detect available models from the endpoint
 */
export async function detectAvailableModels(): Promise<ModelInfo[]> {
  const now = Date.now();
  if (availableModels.length > 0 && (now - lastCheckTime) < CACHE_TTL_MS) {
    return availableModels;
  }

  try {
    const response = await fetch(`${LLM_ENDPOINT}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch models, using defaults');
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

    lastCheckTime = now;
    return availableModels;
  } catch (error) {
    console.error('Error detecting models:', error);
    availableModels = getDefaultModels();
    return availableModels;
  }
}

/**
 * Get default models if detection fails
 */
function getDefaultModels(): ModelInfo[] {
  return [
    { id: 'claude-sonnet-4-8', name: 'Claude Sonnet 4.8', available: true },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', available: true },
  ];
}

/**
 * Get the best available model
 */
export async function getAvailableModel(): Promise<string> {
  const models = await detectAvailableModels();

  // Try to find a Claude model first (preferred for quality)
  const claudeModel = models.find(m =>
    m.id.includes('claude') || m.name.includes('Claude')
  );

  if (claudeModel) {
    return claudeModel.id;
  }

  // Fallback to first available model
  return models[0]?.id || 'claude-sonnet-4-8';
}

/**
 * Create a chat model instance with auto-detection
 */
export async function createChatModel(
  modelName?: string
): Promise<BaseChatModel> {
  const modelId = modelName || await getAvailableModel();

  console.log(`Creating chat model: ${modelId} from ${LLM_ENDPOINT}`);

  return new ChatOpenAI({
    modelName: modelId,
    openAIApiKey: 'not-needed',
    configuration: {
      baseURL: `${LLM_ENDPOINT}/v1`,
    },
    temperature: 0.7,
  });
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
    return model;
  });
}

/**
 * Refresh model cache (call when model availability might have changed)
 */
export async function refreshModelCache(): Promise<ModelInfo[]> {
  availableModels = [];
  lastCheckTime = 0;
  return detectAvailableModels();
}

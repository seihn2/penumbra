export type ModelProviderId =
  | 'openai'
  | 'siliconflow'
  | 'deepseek'
  | 'dashscope'
  | 'moonshot'
  | 'zhipu'
  | 'openrouter'
  | 'volcengine'
  | 'hunyuan'
  | 'minimax'
  | 'yi'
  | 'baichuan'
  | 'gemini'
  | 'xai'
  | 'groq'
  | 'custom'

export interface CommonModel {
  id: string
  supportsVision: boolean
  recommended?: boolean
}

export const MODEL_CATALOG_UPDATED_AT = '2026-08-06'

export const COMMON_MODELS_BY_PROVIDER: Record<ModelProviderId, CommonModel[]> = {
  openai: [
    { id: 'gpt-5.6-sol', supportsVision: true, recommended: true },
    { id: 'gpt-5.6-terra', supportsVision: true },
    { id: 'gpt-5.6-luna', supportsVision: true }
  ],
  siliconflow: [
    { id: 'Qwen/Qwen3.5-35B-A3B', supportsVision: true, recommended: true },
    { id: 'Pro/Qwen/Qwen3.5-397B-A17B', supportsVision: true },
    { id: 'deepseek-ai/DeepSeek-V3.2', supportsVision: false },
    { id: 'Pro/zai-org/GLM-5.1', supportsVision: false },
    { id: 'Pro/moonshotai/Kimi-K2.6', supportsVision: false }
  ],
  deepseek: [
    { id: 'deepseek-v4-pro', supportsVision: false, recommended: true },
    { id: 'deepseek-v4-flash', supportsVision: false }
  ],
  dashscope: [
    { id: 'qwen3.8-max', supportsVision: true, recommended: true },
    { id: 'qwen3.7-plus', supportsVision: true },
    { id: 'qwen3.7-flash', supportsVision: true },
    { id: 'qwen3.5-omni-plus', supportsVision: true }
  ],
  moonshot: [
    { id: 'kimi-k3', supportsVision: true, recommended: true },
    { id: 'kimi-k2.7-code', supportsVision: true },
    { id: 'kimi-k2.6', supportsVision: true },
    { id: 'kimi-k2.5', supportsVision: true }
  ],
  zhipu: [
    { id: 'glm-5v-turbo', supportsVision: true, recommended: true },
    { id: 'glm-4.6v', supportsVision: true },
    { id: 'glm-4.6v-flashx', supportsVision: true },
    { id: 'glm-5.2', supportsVision: false },
    { id: 'glm-5', supportsVision: false }
  ],
  openrouter: [
    { id: 'openrouter/auto', supportsVision: true, recommended: true },
    { id: 'openai/gpt-5.6-sol', supportsVision: true },
    { id: 'anthropic/claude-sonnet-5', supportsVision: true },
    { id: 'google/gemini-3.6-flash', supportsVision: true },
    { id: 'x-ai/grok-4.5', supportsVision: true },
    { id: 'moonshotai/kimi-k3', supportsVision: true },
    { id: 'qwen/qwen3.8-max', supportsVision: true },
    { id: 'z-ai/glm-5.2', supportsVision: false }
  ],
  volcengine: [
    { id: 'doubao-seed-2-1-pro-260628', supportsVision: true, recommended: true },
    { id: 'doubao-seed-2-1-turbo-260628', supportsVision: true },
    { id: 'doubao-seed-evolving', supportsVision: false },
    { id: 'deepseek-v4-pro-260425', supportsVision: false },
    { id: 'deepseek-v4-flash-ga-260731', supportsVision: false },
    { id: 'glm-5-2-260617', supportsVision: false }
  ],
  hunyuan: [
    { id: 'hunyuan-t1-vision-20250916', supportsVision: true, recommended: true },
    { id: 'hunyuan-vision-1.5-instruct', supportsVision: true },
    { id: 'hunyuan-a13b', supportsVision: false },
    { id: 'hunyuan-standard-256K', supportsVision: false }
  ],
  minimax: [
    { id: 'MiniMax-M3', supportsVision: true, recommended: true },
    { id: 'MiniMax-M2.7', supportsVision: false },
    { id: 'MiniMax-M2.7-highspeed', supportsVision: false }
  ],
  yi: [
    { id: 'yi-vision-v2', supportsVision: true, recommended: true },
    { id: 'yi-lightning', supportsVision: false },
    { id: 'yi-large', supportsVision: false },
    { id: 'yi-medium-200k', supportsVision: false }
  ],
  baichuan: [
    { id: 'Baichuan4-Turbo', supportsVision: false, recommended: true },
    { id: 'Baichuan4-Air', supportsVision: false },
    { id: 'Baichuan4', supportsVision: false },
    { id: 'Baichuan3-Turbo-128k', supportsVision: false }
  ],
  gemini: [
    { id: 'gemini-3.6-flash', supportsVision: true, recommended: true },
    { id: 'gemini-3.5-flash', supportsVision: true },
    { id: 'gemini-3.5-flash-lite', supportsVision: true },
    { id: 'gemini-3.1-pro-preview', supportsVision: true }
  ],
  xai: [
    { id: 'grok-4.5', supportsVision: true, recommended: true },
    { id: 'grok-4.20-multi-agent-beta-0309', supportsVision: true },
    { id: 'grok-4-1-fast-reasoning', supportsVision: true },
    { id: 'grok-4-1-fast-non-reasoning', supportsVision: true },
    { id: 'grok-code-fast-1', supportsVision: true }
  ],
  groq: [
    { id: 'qwen/qwen3.6-27b', supportsVision: true, recommended: true },
    {
      id: 'meta-llama/llama-4-scout-17b-16e-instruct',
      supportsVision: true
    },
    { id: 'openai/gpt-oss-120b', supportsVision: false },
    { id: 'openai/gpt-oss-20b', supportsVision: false },
    { id: 'llama-3.3-70b-versatile', supportsVision: false },
    { id: 'llama-3.1-8b-instant', supportsVision: false }
  ],
  custom: []
}

export function detectModelProvider(apiBaseURL: string): ModelProviderId {
  if (!apiBaseURL.trim()) return 'openai'

  let hostname = ''
  try {
    hostname = new URL(apiBaseURL.trim()).hostname.toLowerCase()
  } catch {
    return 'custom'
  }

  if (hostname === 'api.openai.com') return 'openai'
  if (hostname.endsWith('siliconflow.cn')) return 'siliconflow'
  if (hostname.endsWith('deepseek.com')) return 'deepseek'
  if (hostname.endsWith('aliyuncs.com') || hostname.endsWith('qianwenai.com')) return 'dashscope'
  if (hostname.endsWith('moonshot.cn') || hostname.endsWith('kimi.com')) return 'moonshot'
  if (hostname.endsWith('bigmodel.cn')) return 'zhipu'
  if (hostname.endsWith('openrouter.ai')) return 'openrouter'
  if (hostname.endsWith('volces.com') || hostname.endsWith('volcengine.com')) return 'volcengine'
  if (hostname.endsWith('hunyuan.cloud.tencent.com')) return 'hunyuan'
  if (hostname.endsWith('minimaxi.com')) return 'minimax'
  if (hostname.endsWith('lingyiwanwu.com')) return 'yi'
  if (hostname.endsWith('baichuan-ai.com')) return 'baichuan'
  if (hostname === 'generativelanguage.googleapis.com') return 'gemini'
  if (hostname === 'api.x.ai') return 'xai'
  if (hostname.endsWith('groq.com')) return 'groq'
  return 'custom'
}

export function commonModelsFor(apiBaseURL: string): CommonModel[] {
  return COMMON_MODELS_BY_PROVIDER[detectModelProvider(apiBaseURL)]
}

export function recommendedModelFor(apiBaseURL: string): CommonModel | undefined {
  const models = commonModelsFor(apiBaseURL)
  return models.find((model) => model.recommended) ?? models[0]
}

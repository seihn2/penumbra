/** Common OpenAI-compatible providers, for quick-filling the API Base URL so
   users don't have to type these by hand. Values are the base URLs the app
   sends requests to. */
export interface ApiBaseUrlPreset {
  label: string
  url: string
}

export const API_BASE_URL_PRESETS: ApiBaseUrlPreset[] = [
  { label: 'OpenAI', url: 'https://api.openai.com/v1' },
  { label: '硅基流动 SiliconFlow', url: 'https://api.siliconflow.cn/v1' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { label: '阿里云百炼 DashScope', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { label: '月之暗面 Moonshot', url: 'https://api.moonshot.cn/v1' },
  { label: '智谱 GLM', url: 'https://open.bigmodel.cn/api/paas/v4' },
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { label: '火山方舟 Volcengine', url: 'https://ark.cn-beijing.volces.com/api/v3' },
  { label: '腾讯混元 Hunyuan', url: 'https://api.hunyuan.cloud.tencent.com/v1' },
  { label: 'MiniMax', url: 'https://api.minimaxi.com/v1' },
  { label: '零一万物 Yi', url: 'https://api.lingyiwanwu.com/v1' },
  { label: '百川 Baichuan', url: 'https://api.baichuan-ai.com/v1' },
  { label: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { label: 'xAI Grok', url: 'https://api.x.ai/v1' },
  { label: 'Groq', url: 'https://api.groq.com/openai/v1' }
]

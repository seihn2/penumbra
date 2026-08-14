export const ANSWER_API_PROTOCOLS = [
  'auto',
  'responses',
  'chat-completions',
  'anthropic-messages'
] as const

export type AnswerApiProtocol = (typeof ANSWER_API_PROTOCOLS)[number]
export type ConcreteAnswerApiProtocol = Exclude<AnswerApiProtocol, 'auto'>

export const DEFAULT_ANSWER_API_PROTOCOL: AnswerApiProtocol = 'auto'

export function isAnswerApiProtocol(value: unknown): value is AnswerApiProtocol {
  return ANSWER_API_PROTOCOLS.includes(value as AnswerApiProtocol)
}

export function sanitizeAnswerApiProtocol(value: unknown): AnswerApiProtocol {
  return isAnswerApiProtocol(value) ? value : DEFAULT_ANSWER_API_PROTOCOL
}

export function answerApiProtocolOrder(
  protocol: AnswerApiProtocol,
  endpoint: string
): ConcreteAnswerApiProtocol[] {
  if (protocol === 'responses') return ['responses']
  if (protocol === 'chat-completions') return ['chat-completions']
  if (protocol === 'anthropic-messages') return ['anthropic-messages']

  const routeHint = answerApiProtocolRouteHint(endpoint)
  if (routeHint === 'responses') return ['responses', 'chat-completions']
  if (routeHint === 'chat-completions') return ['chat-completions', 'responses']
  if (routeHint === 'anthropic-messages') return ['anthropic-messages']

  if (isOfficialAnthropicEndpoint(endpoint)) return ['anthropic-messages']

  return isOfficialOpenAIEndpoint(endpoint)
    ? ['responses', 'chat-completions']
    : ['chat-completions', 'responses']
}

export function normalizeAnswerApiBaseURL(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '')
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    url.pathname = stripAnswerApiRoute(url.pathname)
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return stripAnswerApiRoute(trimmed)
  }
}

export function isProtocolRouteError(error: unknown): boolean {
  const { statusCode, message } = extractApiErrorDetails(error)
  if (statusCode === 404 || statusCode === 405 || statusCode === 501) return true
  if (statusCode !== 400 && statusCode !== 422) return false

  return ROUTE_ERROR_HINTS.some((hint) => message.includes(hint))
}

function isOfficialOpenAIEndpoint(endpoint: string): boolean {
  if (!endpoint.trim()) return true
  try {
    return new URL(endpoint).hostname.toLowerCase() === 'api.openai.com'
  } catch {
    return false
  }
}

export function normalizeAnthropicBaseURL(endpoint: string): string | undefined {
  const trimmed = endpoint.trim().replace(/\/+$/, '')
  if (!trimmed) return undefined

  try {
    const url = new URL(trimmed)
    if (url.hostname.toLowerCase() !== 'api.anthropic.com') return trimmed
    if (!url.pathname || url.pathname === '/') url.pathname = '/v1'
    return url.toString().replace(/\/$/, '')
  } catch {
    return trimmed
  }
}

function isOfficialAnthropicEndpoint(endpoint: string): boolean {
  if (!endpoint.trim()) return false
  try {
    return new URL(endpoint).hostname.toLowerCase() === 'api.anthropic.com'
  } catch {
    return false
  }
}

function answerApiProtocolRouteHint(endpoint: string): ConcreteAnswerApiProtocol | undefined {
  const pathname = endpointPathname(endpoint)
  if (/\/responses\/?$/i.test(pathname)) return 'responses'
  if (/\/chat\/completions\/?$/i.test(pathname)) return 'chat-completions'
  if (/\/messages\/?$/i.test(pathname)) return 'anthropic-messages'
  return undefined
}

function endpointPathname(endpoint: string): string {
  try {
    return new URL(endpoint.trim()).pathname
  } catch {
    return endpoint.trim()
  }
}

function stripAnswerApiRoute(endpoint: string): string {
  return endpoint.replace(/\/(?:responses|chat\/completions|messages)\/?$/i, '')
}

const ROUTE_ERROR_HINTS = [
  '/responses',
  '/chat/completions',
  'responses api',
  'chat completions',
  'chat/completions',
  'endpoint',
  'route',
  'not implemented',
  'not supported',
  'unsupported'
]

function extractApiErrorDetails(error: unknown): { statusCode?: number; message: string } {
  if (!error || typeof error !== 'object') {
    return { message: String(error ?? '').toLowerCase() }
  }

  const candidate = error as {
    statusCode?: unknown
    status?: unknown
    message?: unknown
    responseBody?: unknown
    cause?: unknown
  }
  const statusCode =
    typeof candidate.statusCode === 'number'
      ? candidate.statusCode
      : typeof candidate.status === 'number'
        ? candidate.status
        : undefined
  const parts = [candidate.message, candidate.responseBody]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')

  if (parts) return { statusCode, message: parts.toLowerCase() }
  if (candidate.cause && candidate.cause !== error) {
    const cause = extractApiErrorDetails(candidate.cause)
    return { statusCode: statusCode ?? cause.statusCode, message: cause.message }
  }
  return { statusCode, message: '' }
}

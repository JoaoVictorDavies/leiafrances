import { z } from 'zod'
import { goals, type Goal } from './schema'

const system = `Você é um professor particular de francês para falantes de português brasileiro.
O aprendizado é adaptativo e baseado exclusivamente no estado fornecido, sem histórico de conversa.
Todas as instruções, explicações e títulos devem estar em português; use francês nos exemplos e questões.
Cada questão deve ter quatro alternativas A, B, C e D, exatamente uma correta, com correctId e explanation.
Responda apenas JSON válido, sem markdown. Não inclua dados pessoais.`

const providerCodes = [
  'insufficient_quota', 'credit_balance_exhausted', 'organization_usage_limit_exceeded',
  'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'rate_limit_exceeded',
] as const
type ProviderCode = typeof providerCodes[number] | 'unknown'

export class AIProviderError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ProviderCode,
    public readonly requestId: string | null,
  ) {
    super(`Provedor de IA retornou HTTP ${status}`)
  }
}

async function providerError(response: Response): Promise<AIProviderError> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  const parsed = z.object({
    error: z.object({ code: z.string().nullish(), type: z.string().nullish() }).passthrough(),
  }).safeParse(payload)
  const rawCode = parsed.success ? parsed.data.error.code : null
  const rawType = parsed.success ? parsed.data.error.type : null
  const knownCode = providerCodes.find((code) => code === rawCode)
  const code = knownCode ?? (rawType === 'insufficient_quota' ? 'insufficient_quota' :
    rawType === 'rate_limit_exceeded' ? 'rate_limit_exceeded' : 'unknown')
  const header = response.headers.get('x-request-id')
  const requestId = header && /^[a-zA-Z0-9_-]{1,128}$/.test(header) ? header : null
  return new AIProviderError(response.status, code, requestId)
}

export async function generate<T>(goal: Goal, task: string, context: object, schema: z.ZodType<T>): Promise<T> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY não configurada')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.6,
      max_completion_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${system}\nObjetivo desta jornada: ${goals[goal].context}.` },
        { role: 'user', content: JSON.stringify({ task, state: context }) },
      ],
    }),
    signal: AbortSignal.timeout(90000),
    cache: 'no-store',
  })
  if (!response.ok) throw await providerError(response)
  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Resposta vazia do provedor de IA')
  return schema.parse(JSON.parse(content))
}

export const questionShape = `Cada questão: {"prompt":"...","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correctId":"A","explanation":"..."}.`

import { z } from 'zod'
import { goals, type Goal } from './schema'

const system = `Você é um professor particular de francês para falantes de português brasileiro.
O aprendizado é adaptativo e baseado exclusivamente no estado fornecido, sem histórico de conversa.
Todas as instruções, explicações e títulos devem estar em português; use francês nos exemplos e questões.
Cada questão deve ter quatro alternativas A, B, C e D, exatamente uma correta, com correctId e explanation.
Responda apenas JSON válido, sem markdown. Não inclua dados pessoais.`

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
  if (!response.ok) throw new Error(`Provedor de IA retornou HTTP ${response.status}`)
  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Resposta vazia do provedor de IA')
  return schema.parse(JSON.parse(content))
}

export const questionShape = `Cada questão: {"prompt":"...","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correctId":"A","explanation":"..."}.`

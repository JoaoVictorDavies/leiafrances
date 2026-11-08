import test from 'node:test'
import assert from 'node:assert/strict'
import { GET, POST } from '../app/api/teacher/route'

test('API autentica, isola contas e persiste o ciclo de nivelamento e adaptação', async () => {
  const originalFetch = globalThis.fetch
  const originalEnv = { ...process.env }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service'
  process.env.OPENAI_API_KEY = 'test-ai'
  const rows = new Map<string, { state: unknown; revision: number }>()
  let aiFailure: { status: number; body: unknown } | null = null
  const question = {
    prompt: 'Escolha', options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: `opção ${id}` })),
    correctId: 'A', explanation: 'Explicação',
  }
  const generated = [
    { introduction: 'Introdução', questions: [question, question, question] },
    { phases: Array.from({ length: 5 }, (_, i) => ({ title: `Fase ${i + 1}`, objective: 'Objetivo' })), level: 'A1', strengths: [], difficulties: ['verbos'], exercise: question },
    { suggestedPhase: 2, strengths: [], difficulties: ['verbos'], encouragement: 'Continue', exercise: question },
  ]
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const auth = request.headers.get('authorization')
    if (url.hostname === 'api.openai.com') {
      assert.equal(auth, 'Bearer test-ai')
      if (aiFailure) return respond(aiFailure.body, aiFailure.status)
      return respond({ choices: [{ message: { content: JSON.stringify(generated.shift()) } }] })
    }
    assert.equal(url.hostname, 'test.supabase.co')
    if (url.pathname === '/auth/v1/user') {
      if (auth === 'Bearer token-a') return respond({ id: 'user-a' })
      if (auth === 'Bearer token-b') return respond({ id: 'user-b' })
      return respond({ message: 'invalid' }, 401)
    }
    assert.equal(auth, 'Bearer test-service')
    if (url.pathname.endsWith('/rpc/claim_teacher_generation')) return respond('ok')
    if (url.pathname.endsWith('/rpc/release_teacher_generation')) return respond(null)
    if (url.pathname.endsWith('/teacher_journeys')) {
      if (request.method === 'GET') {
        const user = url.searchParams.get('user_id')?.replace('eq.', '') || ''
        return respond(rows.has(user) ? [rows.get(user)] : [])
      }
      const body = await request.json()
      if (request.method === 'POST') {
        rows.set(body.user_id, { state: body.state, revision: body.revision })
        return respond({ revision: body.revision }, 201)
      }
      if (request.method === 'PATCH') {
        const user = url.searchParams.get('user_id')?.replace('eq.', '') || ''
        const revision = Number(url.searchParams.get('revision')?.replace('eq.', ''))
        if (rows.get(user)?.revision !== revision) return respond([])
        rows.set(user, { state: body.state, revision: body.revision })
        return respond([{ revision: body.revision }])
      }
    }
    throw new Error(`Unexpected request: ${request.method} ${url}`)
  }
  const request = (token?: string, body?: object) => new Request('http://localhost/api/teacher', {
    method: body ? 'POST' : 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  try {
    assert.equal((await GET(request())).status, 401)
    assert.equal((await GET(request('invalid'))).status, 401)
    const start = await POST(request('token-a', { action: 'start', goal: 'viagem' }))
    assert.equal(start.status, 200)
    const first = await start.json()
    assert.equal(first.journey.stage, 'placement')
    assert.doesNotMatch(JSON.stringify(first), /correctId|explanation/)
    const other = await (await GET(request('token-b'))).json()
    assert.equal(other.journey, null)
    const placement = await POST(request('token-a', { action: 'placement', revision: 1, answers: ['A', 'B', 'A'] }))
    assert.equal(placement.status, 200)
    const phase = await placement.json()
    assert.equal(phase.journey.phase, 1)
    assert.equal(phase.journey.phases.length, 5)
    const answer = await POST(request('token-a', { action: 'answer', revision: 2, answer: 'B' }))
    assert.equal(answer.status, 200)
    const adapted = await answer.json()
    assert.equal(adapted.journey.phase, 1)
    assert.equal(adapted.journey.feedback.correct, false)
    assert.equal(adapted.journey.revision, 3)
    assert.equal((await POST(request('token-a', { action: 'answer', revision: 2, answer: 'A' }))).status, 409)
    const restored = await (await GET(request('token-a'))).json()
    assert.equal(restored.journey.revision, 3)
    assert.doesNotMatch(JSON.stringify(restored.journey.exercise), /correctId|explanation/)
    assert.equal((await (await GET(request('token-b'))).json()).journey, null)
    for (const [body, status, expected] of [
      [{ error: { code: 'credit_balance_exhausted', message: 'sensitive text' } }, 503, 'administrador'],
      [{ error: { code: 'rate_limit_exceeded' } }, 429, 'Aguarde'],
      [{ error: { code: 'other', type: 'insufficient_quota' } }, 503, 'administrador'],
      [{ error: { code: 'unrecognized' } }, 429, 'atingiu um limite'],
    ] as const) {
      aiFailure = { status: 429, body }
      const failure = await POST(request('token-a', { action: 'answer', revision: 3, answer: 'A' }))
      assert.equal(failure.status, status)
      const message = (await failure.json()).error
      assert.match(message, new RegExp(expected))
      assert.doesNotMatch(message, /sensitive text/)
      assert.equal(rows.get('user-a')?.revision, 3)
    }
    aiFailure = { status: 503, body: { error: 'unavailable' } }
    assert.equal((await POST(request('token-a', { action: 'answer', revision: 3, answer: 'A' }))).status, 502)
    assert.equal(rows.get('user-a')?.revision, 3)
  } finally {
    globalThis.fetch = originalFetch
    process.env = originalEnv
  }
})

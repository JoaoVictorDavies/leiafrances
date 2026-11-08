import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { AIProviderError, generate } from '@/app/lib/teacher/ai'
import { advanceJourney, JourneyError } from '@/app/lib/teacher/engine'
import {
  actionSchema, journeySchema, publicJourney,
} from '@/app/lib/teacher/schema'

export const dynamic = 'force-dynamic'

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) throw new Error('Configuração do Supabase incompleta')
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  return { auth: createClient(url, anon, options), db: createClient(url, service, options) }
}

async function authenticate(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return null
  const { auth, db } = clients()
  const { data, error } = await auth.auth.getUser(token)
  if (error || !data.user) return null
  return { userId: data.user.id, db }
}

async function load(db: ReturnType<typeof clients>['db'], userId: string) {
  const { data, error } = await db.from('teacher_journeys').select('state, revision').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data ? { state: journeySchema.parse(data.state), revision: data.revision as number } : null
}

export async function GET(request: Request) {
  try {
    const identity = await authenticate(request)
    if (!identity) return json({ error: 'Entre na sua conta para acessar sua jornada.' }, 401)
    const current = await load(identity.db, identity.userId)
    return json({ journey: current ? publicJourney(current.state, current.revision) : null })
  } catch (error) {
    console.error('Erro ao carregar jornada:', error)
    return json({ error: 'Não foi possível carregar sua jornada. Tente novamente.' }, 500)
  }
}

export async function POST(request: Request) {
  let identity: Awaited<ReturnType<typeof authenticate>> = null
  const leaseId = crypto.randomUUID()
  let claimed = false
  try {
    identity = await authenticate(request)
    if (!identity) return json({ error: 'Entre na sua conta para acessar sua jornada.' }, 401)
    const body = await request.text()
    if (body.length > 8192) return json({ error: 'Requisição muito grande.' }, 400)
    let input: unknown
    try { input = JSON.parse(body) } catch { return json({ error: 'Requisição inválida.' }, 400) }
    const parsed = actionSchema.safeParse(input)
    if (!parsed.success) return json({ error: 'Dados da requisição inválidos.' }, 400)
    const action = parsed.data

    const { data: claim, error: claimError } = await identity.db.rpc('claim_teacher_generation', {
      p_user_id: identity.userId, p_lease_id: leaseId,
    })
    if (claimError) throw claimError
    if (claim !== 'ok') {
      const message = claim === 'daily_limit' || claim === 'global_limit' ? 'Limite diário de gerações atingido. Tente novamente amanhã (UTC).' :
        claim === 'cooldown' ? 'Aguarde alguns segundos antes de continuar.' : 'Já existe uma geração em andamento. Aguarde e tente novamente.'
      return json({ error: message }, 429)
    }
    claimed = true
    const current = await load(identity.db, identity.userId)
    const next = await advanceJourney(action, current, generate)

    const revision = (current?.revision ?? 0) + 1
    const { data: saved, error: saveError } = current
      ? await identity.db.from('teacher_journeys').update({ state: next, revision, updated_at: new Date().toISOString() })
        .eq('user_id', identity.userId).eq('revision', current.revision).select('revision').maybeSingle()
      : await identity.db.from('teacher_journeys').insert({ user_id: identity.userId, state: next, revision }).select('revision').single()
    if (saveError) throw saveError
    if (!saved) return json({ error: 'A jornada foi alterada. Atualize a página e tente novamente.' }, 409)
    return json({ journey: publicJourney(next, revision) })
  } catch (error) {
    if (error instanceof JourneyError) return json({ error: error.message }, error.status)
    if (error instanceof AIProviderError) {
      console.error('Falha do provedor de IA:', { status: error.status, code: error.code, requestId: error.requestId })
      if (error.status === 429) {
        if (error.code === 'rate_limit_exceeded') {
          return json({ error: 'O serviço de IA está recebendo muitas solicitações. Aguarde um pouco e tente novamente.' }, 429)
        }
        if (error.code !== 'unknown') {
          return json({ error: 'O serviço de IA está temporariamente indisponível. O administrador precisa verificar a conta do provedor.' }, 503)
        }
        return json({ error: 'O serviço de IA atingiu um limite. Tente mais tarde ou entre em contato com o administrador.' }, 429)
      }
      return json({ error: 'O serviço de IA está temporariamente indisponível. Tente novamente mais tarde.' }, 502)
    }
    console.error('Erro na jornada de aprendizagem:', error)
    return json({ error: 'Não foi possível gerar ou salvar a próxima etapa. Tente novamente.' }, 500)
  } finally {
    if (identity && claimed) {
      const { error } = await identity.db.rpc('release_teacher_generation', { p_user_id: identity.userId, p_lease_id: leaseId })
      if (error) console.error('Erro ao liberar geração:', error)
    }
  }
}

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Provider, Session } from '@supabase/supabase-js'
import { getSupabase } from '@/app/lib/supabase'
import { goals, type Goal, type publicJourney } from '@/app/lib/teacher/schema'

type ViewJourney = ReturnType<typeof publicJourney>
type OptionId = 'A' | 'B' | 'C' | 'D'

export default function ProfessorPage() {
  const [workerReady, setWorkerReady] = useState(false)
  const [workerError, setWorkerError] = useState('')

  useEffect(() => {
    let active = true
    async function prepare() {
      if (!('serviceWorker' in navigator)) {
        if (active) setWorkerReady(true)
        return
      }
      const registration = await navigator.serviceWorker.register('/sw.js')
      await registration.update()
      // An older worker cached Supabase responses without separating accounts.
      // Do not initialize authentication until the safe worker controls this page.
      for (let attempt = 0; attempt < 30 && active; attempt++) {
        const controller = navigator.serviceWorker.controller
        if (controller) {
          const safe = await new Promise<boolean>((resolve) => {
            const channel = new MessageChannel()
            const timer = window.setTimeout(() => { channel.port1.close(); resolve(false) }, 300)
            channel.port1.onmessage = (event) => {
              window.clearTimeout(timer)
              channel.port1.close()
              resolve(event.data === 'teacher-cache-safe-v1')
            }
            controller.postMessage('teacher-cache-check', [channel.port2])
          })
          if (safe) { if (active) setWorkerReady(true); return }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 300))
      }
      if (active) setWorkerError('Não foi possível atualizar a proteção de dados do aplicativo. Conecte-se à internet e atualize a página.')
    }
    prepare().catch((error) => {
      console.error('Erro ao preparar proteção de dados:', error)
      if (active) setWorkerError('Não foi possível atualizar a proteção de dados do aplicativo. Conecte-se à internet e atualize a página.')
    })
    return () => { active = false }
  }, [])

  if (!workerReady) return <main className="min-h-screen bg-black text-white p-10" role="status">{workerError || 'Preparando proteção de dados...'}</main>
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <main className="min-h-screen bg-black text-white p-10" role="alert">O acesso ao professor ainda não foi configurado.</main>
  }
  return <TeacherJourney />
}

function TeacherJourney() {
  const supabase = useMemo(() => getSupabase(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [journey, setJourney] = useState<ViewJourney | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reload, setReload] = useState(0)
  const [restartRevision, setRestartRevision] = useState<number | undefined>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [consentedUserId, setConsentedUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [answers, setAnswers] = useState<Record<number, OptionId>>({})
  const [answer, setAnswer] = useState<OptionId | ''>('')
  const consent = !!session && consentedUserId === session.user.id

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError('Não foi possível verificar sua sessão.')
      setSession(data.session)
      setReady(true)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setReady(true) }
    })
    return () => { active = false; subscription.subscription.unsubscribe() }
  }, [supabase])

  useEffect(() => {
    let active = true
    setJourney(null)
    setAnswers({})
    setAnswer('')
    setLoaded(false)
    setRestartRevision(undefined)
    if (!session) { setLoading(false); return }
    setLoading(true)
    fetch('/api/teacher', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Erro ao carregar jornada.')
        if (active) { setJourney(data.journey); setLoaded(true); setError('') }
      })
      .catch((err: Error) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session, reload])

  async function authenticate(signUp: boolean) {
    setError(''); setNotice(''); setLoading(true)
    try {
      const { error } = signUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (signUp) setNotice('Conta criada. Se necessário, confirme seu e-mail antes de entrar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível autenticar.')
    } finally { setLoading(false) }
  }

  async function authenticateWithProvider(provider: Extract<Provider, 'google' | 'facebook'>) {
    setError(''); setNotice(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/professor` },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar o acesso social.')
    } finally { setLoading(false) }
  }

  async function advance(payload: object) {
    if (!session) return
    setError(''); setNotice(''); setLoading(true)
    try {
      const { data: current, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !current.session) throw new Error('Sua sessão expirou. Entre novamente.')
      const response = await fetch('/api/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${current.session.access_token}` },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível continuar.')
      setJourney(data.journey)
      setAnswers({})
      setAnswer('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar.')
    } finally { setLoading(false) }
  }

  const button = 'border border-white/40 px-5 py-3 text-sm hover:bg-white hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <main className="min-h-screen bg-black text-white font-serif px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        <nav className="flex justify-between items-center text-xs uppercase tracking-widest">
          <Link href="/" className="hover:opacity-60">← Início</Link>
          {session && <button onClick={async () => {
            const { error } = await supabase.auth.signOut()
            if (error) setError('Não foi possível sair da conta.')
          }}>Sair</button>}
        </nav>
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Leia Francês</p>
          <h1 className="text-4xl md:text-5xl italic">Seu professor de francês</h1>
          <p className="text-zinc-400 leading-relaxed">Uma jornada que se adapta às suas respostas e ao seu objetivo.</p>
        </header>

        {error && <p role="alert" className="border border-red-400/50 p-4 text-red-200">{error}</p>}
        {notice && <p role="status" className="border border-white/20 p-4">{notice}</p>}
        {!ready ? <p>Verificando sessão...</p> : !session ? (
          <section className="space-y-5 max-w-md">
            <h2 className="text-2xl">Entre para começar</h2>
            <p className="text-zinc-400 text-sm">Sua jornada é privada e requer conexão. Conteúdos gerados podem conter erros.</p>
            <label className="block space-y-2">E-mail<input className="block w-full bg-zinc-900 border border-zinc-700 p-3" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block space-y-2">Senha<input className="block w-full bg-zinc-900 border border-zinc-700 p-3" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <div className="flex flex-wrap gap-3">
              <button className={button} disabled={loading || !email || !password} onClick={() => authenticate(false)}>Entrar</button>
              <button className={button} disabled={loading || !email || !password} onClick={() => authenticate(true)}>Criar conta</button>
            </div>
            <p className="text-sm text-zinc-400">Ou continue com</p>
            <div className="flex flex-wrap gap-3">
              <button className={button} disabled={loading} onClick={() => authenticateWithProvider('google')}>Google</button>
              <button className={button} disabled={loading} onClick={() => authenticateWithProvider('facebook')}>Facebook</button>
            </div>
          </section>
        ) : loading ? (
          <p role="status" className="animate-pulse">Preparando sua jornada... Isso pode levar alguns instantes.</p>
        ) : !loaded ? (
          <button className={button} onClick={() => setReload((value) => value + 1)}>Tentar carregar novamente</button>
        ) : !consent ? (
          <section className="space-y-5">
            <p className="text-zinc-300 leading-relaxed">Para criar e adaptar as atividades, o objetivo, suas respostas e um resumo do seu aprendizado serão enviados à OpenAI. Não envie informações pessoais nas atividades. A IA pode cometer erros e exige conexão.</p>
            <button className={button} onClick={() => setConsentedUserId(session.user.id)}>Concordo e quero continuar</button>
          </section>
        ) : !journey ? (
          <section className="space-y-5">
            <h2 className="text-2xl">Qual é seu objetivo?</h2>
            <p className="text-zinc-400">Escolha uma jornada para criar um nivelamento personalizado.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(goals) as Goal[]).map((goal) => (
                <button key={goal} className={`${button} text-left`} onClick={() => advance({ action: 'start', goal, revision: restartRevision })}>{goals[goal].label}</button>
              ))}
            </div>
          </section>
        ) : journey.stage === 'placement' ? (
          <section className="space-y-8">
            <div><p className="text-xs uppercase tracking-widest text-zinc-400">{goals[journey.goal].label} · Nivelamento</p><p className="mt-4 leading-relaxed">{journey.introduction}</p></div>
            {journey.questions.map((question, index) => (
              <fieldset key={index} className="space-y-3 border-t border-white/20 pt-6">
                <legend className="text-lg px-2">{index + 1}. {question.prompt}</legend>
                {question.options.map((option) => (
                  <label key={option.id} className="flex gap-3 items-start p-3 border border-white/10 hover:border-white/50 cursor-pointer">
                    <input type="radio" name={`question-${index}`} checked={answers[index] === option.id} onChange={() => setAnswers({ ...answers, [index]: option.id })} />
                    <span>{option.text}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            <button className={button} disabled={Object.keys(answers).length !== journey.questions.length} onClick={() => advance({ action: 'placement', revision: journey.revision, answers: journey.questions.map((_, index) => answers[index]) })}>Criar minha primeira fase</button>
          </section>
        ) : (
          <section className="space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-zinc-400">{goals[journey.goal].label} · Nível estimado {journey.level}</p>
              <h2 className="text-3xl">Fase {journey.phase}: {journey.phases[journey.phase - 1].title}</h2>
              <p className="text-zinc-400">{journey.phases[journey.phase - 1].objective}</p>
              <p className="text-sm text-zinc-400">{journey.correct} acertos em {journey.attempts} exercícios</p>
            </div>
            <details className="border border-white/20 p-4"><summary className="cursor-pointer">Ver as cinco fases</summary><ol className="mt-4 space-y-3">{journey.phases.map((phase, index) => <li key={index}>{index + 1}. {phase.title} — {phase.objective}</li>)}</ol></details>
            {journey.feedback && <div role="status" className="border border-white/30 p-5 space-y-2"><strong>{journey.feedback.correct ? 'Resposta correta' : 'Vamos praticar mais'}</strong><p>{journey.feedback.explanation}</p><p className="text-zinc-400">{journey.feedback.encouragement}</p></div>}
            <fieldset className="space-y-3 border-t border-white/20 pt-6">
              <legend className="text-xl px-2">{journey.exercise.prompt}</legend>
              {journey.exercise.options.map((option) => <label key={option.id} className="flex gap-3 items-start p-3 border border-white/10 hover:border-white/50 cursor-pointer"><input type="radio" name="exercise" checked={answer === option.id} onChange={() => setAnswer(option.id)} /><span>{option.text}</span></label>)}
            </fieldset>
            <button className={button} disabled={!answer} onClick={() => advance({ action: 'answer', revision: journey.revision, answer })}>Responder e continuar</button>
          </section>
        )}
        {journey && !loading && consent && <button className="text-sm text-zinc-500 underline" onClick={() => { if (window.confirm('Uma nova jornada substituirá a atual quando você escolher um objetivo. Continuar?')) { setRestartRevision(journey.revision); setJourney(null) } }}>Escolher outro objetivo</button>}
      </div>
    </main>
  )
}

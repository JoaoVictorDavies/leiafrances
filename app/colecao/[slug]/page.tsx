'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Segment = {
  order_index: number
  text_fr: string
  text_pt: string
}

type Work = {
  id: string
  title: string
  author: string
  segments: Segment[]
}

export default function ColecaoPage() {
  const params = useParams()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(true) // Padrão: Preto com Branco

  useEffect(() => {
    async function load() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key || !params.slug) return

      const supabase = createClient(url, key)
      const { data, error } = await supabase
        .from('works')
        .select(`
          id, title, author,
          segments (order_index, text_fr, text_pt),
          collections!inner ( slug )
        `)
        .eq('collections.slug', params.slug)
        .order('created_at', { ascending: true })

      if (!error && data) setWorks(data)
      setLoading(false)
    }
    load()
  }, [params.slug])

  const themeClass = isDarkMode ? 'bg-black text-white' : 'bg-[#fdfdfd] text-[#111111]'

  if (loading) {
    return (
      <main className={`min-h-screen flex items-center justify-center font-serif ${themeClass}`}>
        Carregando...
      </main>
    )
  }

  return (
    <main className={`min-h-screen flex flex-col items-center px-6 py-12 font-serif transition-colors duration-500 ${themeClass}`}>
      
      {/* HEADER FIXO: Voltar + Toggle */}
      <nav className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 transition-colors ${isDarkMode ? 'bg-black/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'}`}>
        <Link 
          href="/" 
          className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isDarkMode ? 'text-white' : 'text-black'} hover:opacity-50 transition-opacity`}
        >
          ← Início
        </Link>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`px-3 py-1 text-[10px] uppercase tracking-tighter border rounded-full transition-all ${isDarkMode ? 'border-white text-white hover:bg-white hover:text-black' : 'border-black text-black hover:bg-black hover:text-white'}`}
        >
          {isDarkMode ? 'Fundo Claro' : 'Fundo Escuro'}
        </button>
      </nav>

      <article className="w-full max-w-2xl text-center space-y-24 mt-20">
        
        {/* Aviso que some ao rolar */}
        <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 mb-12 animate-pulse">
          Clique nas frases para ver a tradução
        </p>

        {works.length === 0 && (
          <p className="opacity-40 italic">Nenhum texto nesta coleção.</p>
        )}
        
        {works.map(work => (
          <section key={work.id}>
            <header className="mb-12">
              <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight">
                {work.title}
              </h1>
              <p className={`italic opacity-60 text-base`}>
                {work.author}
              </p>
            </header>

            <section className="space-y-6 text-xl md:text-2xl leading-relaxed">
              {work.segments
                .sort((a, b) => a.order_index - b.order_index)
                .map((s, i) => (
                  <details key={i} className="group outline-none border-b border-transparent">
                    <summary className="cursor-pointer list-none hover:opacity-50 transition-opacity py-1">
                      {s.text_fr}
                    </summary>
                    <p className={`text-base mt-3 italic border-l pl-6 py-2 mx-auto max-w-md text-left ${isDarkMode ? 'text-zinc-400 border-zinc-700' : 'text-zinc-500 border-zinc-200'}`}>
                      {s.text_pt}
                    </p>
                  </details>
                ))}
            </section>
          </section>
        ))}
      </article>
    </main>
  )
}
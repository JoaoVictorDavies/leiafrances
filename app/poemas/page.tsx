'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

export default function PoemasPage() {
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('works')
        .select(`
          id,
          title,
          author,
          segments (
            order_index,
            text_fr,
            text_pt
          ),
          collections!inner ( slug )
        `)
        .eq('collections.slug', 'poemas')
        .order('created_at', { ascending: true })

      if (!error && data) {
        setWorks(data)
      }

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Carregando…
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black flex justify-center px-6 py-24">
      <article className="w-full max-w-2xl text-center space-y-24">
        {works.map(work => (
          <section key={work.id}>
            <header className="mb-16">
              <h1 className="text-4xl font-serif font-semibold mb-4">
                {work.title}
              </h1>
              <p className="italic text-sm text-zinc-500">
                {work.author}
              </p>
            </header>

            <section className="space-y-4 text-lg">
              {work.segments
                .sort((a, b) => a.order_index - b.order_index)
                .map((s, i) => (
                  <details key={i}>
                    <summary className="cursor-pointer">
                      {s.text_fr}
                    </summary>
                    <p className="text-sm text-zinc-500 mt-1">
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

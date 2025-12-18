export const dynamic = 'force-dynamic'

import { getSupabase } from '../lib/supabase'

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

export default async function PoemasPage() {
  const supabase = getSupabase()

  const { data: works, error } = await supabase
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
      collections!inner (
        slug
      )
    `)
    .eq('collections.slug', 'poemas')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black flex justify-center px-6 py-24">
      <article className="w-full max-w-2xl text-center text-zinc-900 dark:text-zinc-100 space-y-24">

        {works?.map((work) => (
          <section key={work.id}>

            {/* Cabeçalho */}
            <header className="mb-16">
              <h1 className="text-4xl font-serif font-semibold tracking-tight mb-4">
                {work.title}
              </h1>
              <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                {work.author}
              </p>
            </header>

            {/* Poema */}
            <section className="space-y-4 text-lg leading-8">
              {work.segments
                .sort((a, b) => a.order_index - b.order_index)
                .map((segment, index) => (
                  <details
                    key={index}
                    className="group cursor-pointer transition-all"
                  >
                    <summary className="list-none focus:outline-none">
                      <span className="block font-serif group-hover:text-zinc-500 transition-colors">
                        {segment.text_fr}
                      </span>
                    </summary>

                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {segment.text_pt}
                    </p>
                  </details>
                ))}
            </section>

          </section>
        ))}

        <footer className="text-xs text-zinc-400 dark:text-zinc-500">
          <p>Clique em cada verso para revelar a tradução.</p>
          <p className="mt-2">Textos de domínio público · Coleção: Poemas</p>
        </footer>

      </article>
    </main>
  )
}

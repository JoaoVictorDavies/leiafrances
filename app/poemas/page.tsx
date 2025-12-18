export default function PoemasPage() {
  const poem = {
    title: "Sensation",
    author: "Arthur Rimbaud",
    verses: [
      {
        fr: "Par les soirs bleus d’été, j’irai dans les sentiers,",
        pt: "Nas noites azuis de verão, caminharei pelos trilhos,"
      },
      {
        fr: "Picoté par les blés, fouler l’herbe menue :",
        pt: "Picado pelos trigais, pisando a relva miúda:"
      },
      {
        fr: "Rêveur, j’en sentirai la fraîcheur à mes pieds.",
        pt: "Sonhador, sentirei o frescor em meus pés."
      },
      {
        fr: "Je laisserai le vent baigner ma tête nue.",
        pt: "Deixarei o vento banhar minha cabeça nua."
      },
      {
        fr: "Je ne parlerai pas, je ne penserai rien :",
        pt: "Não falarei, não pensarei em nada:"
      },
      {
        fr: "Mais l’amour infini me montera dans l’âme,",
        pt: "Mas o amor infinito subirá em minha alma,"
      },
      {
        fr: "Et j’irai loin, bien loin, comme un bohémien,",
        pt: "E irei longe, bem longe, como um boêmio,"
      },
      {
        fr: "Par la Nature — heureux comme avec une femme.",
        pt: "Pela Natureza — feliz como junto a uma mulher."
      }
    ]
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black flex justify-center px-6 py-24">
      <article className="w-full max-w-2xl text-center text-zinc-900 dark:text-zinc-100">
        
        {/* Cabeçalho */}
        <header className="mb-16">
          <h1 className="text-4xl font-serif font-semibold tracking-tight mb-4">
            {poem.title}
          </h1>
          <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
            {poem.author}
          </p>
        </header>

        {/* Poema */}
        <section className="space-y-4 text-lg leading-8">
          {poem.verses.map((verse, index) => (
            <details
              key={index}
              className="group cursor-pointer transition-all"
            >
              <summary className="list-none focus:outline-none">
                <span className="block font-serif group-hover:text-zinc-500 transition-colors">
                  {verse.fr}
                </span>
              </summary>

              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {verse.pt}
              </p>
            </details>
          ))}
        </section>

        {/* Rodapé */}
        <footer className="mt-20 text-xs text-zinc-400 dark:text-zinc-500">
          <p>
            Clique em cada verso para revelar a tradução.
          </p>
          <p className="mt-2">
            Texto em domínio público · Leitura interativa
          </p>
        </footer>

      </article>
    </main>
  )
}

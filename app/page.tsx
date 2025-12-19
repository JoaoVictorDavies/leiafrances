'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

type Collection = {
  id: string
  title: string
  slug: string
}

export default function HomePage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(true) 
  const [showCollections, setShowCollections] = useState(false)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function getCollections() {
      const { data, error } = await supabase
        .from('collections')
        .select('id, title, slug')
        .order('title', { ascending: true })

      if (!error && data) setCollections(data)
      setLoading(false)
    }
    getCollections()
  }, [])

  const themeClass = isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
  const borderClass = isDarkMode ? 'border-white/20 hover:border-white' : 'border-black/20 hover:border-black'

  return (
    <main className={`min-h-screen flex flex-col items-center justify-between p-6 md:p-12 font-serif transition-colors duration-500 ${themeClass}`}>
      
      {/* Botão de Inverter Cores (Fixo) */}
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)}
        className={`fixed top-6 right-6 z-50 px-3 py-1 text-[10px] uppercase tracking-tighter border rounded-full transition-all ${isDarkMode ? 'border-white text-white hover:bg-white hover:text-black' : 'border-black text-black hover:bg-black hover:text-white'}`}
      >
        {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
      </button>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl text-center">
        <header className={`transition-all duration-700 ${showCollections ? 'mb-12' : 'mb-8'}`}>
          <h1 className="text-5xl md:text-7xl font-light tracking-tighter italic">
            Leia Francês
          </h1>
        </header>

        <div className="w-full max-w-sm flex flex-col items-center">
          {!showCollections ? (
            <button
              onClick={() => setShowCollections(true)}
              className={`px-12 py-4 border text-lg uppercase tracking-[0.3em] transition-all duration-300 ${borderClass} ${isDarkMode ? 'hover:bg-white hover:text-black' : 'hover:bg-black hover:text-white'}`}
            >
              Ler agora
            </button>
          ) : (
            <nav className="flex flex-col gap-4 w-full animate-in fade-in duration-1000">
              {loading ? (
                <p className="opacity-40 animate-pulse text-sm font-sans uppercase tracking-widest">
                  Buscando coleções...
                </p>
              ) : (
                collections.map((col) => (
                  <Link
                    key={col.id}
                    href={`/colecao/${col.slug}`}
                    className={`px-8 py-5 border text-xl transition-all duration-300 ${borderClass} ${isDarkMode ? 'hover:bg-white hover:text-black' : 'hover:bg-black hover:text-white'}`}
                  >
                    {col.title}
                  </Link>
                ))
              )}
            </nav>
          )}
        </div>
      </div>

      {/* Rodapé Gourmet */}
      <footer className={`w-full max-w-xl text-center border-t pt-10 pb-10 mt-12 transition-colors ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
        <div className="flex flex-col items-center space-y-8">
          
          {/* Símbolo e Nome da Marca */}
          <div className="flex flex-col items-center space-y-2">
            <span className="text-2xl opacity-80">⚜</span>
            <span className="text-xs uppercase tracking-[0.4em] font-medium">
              Leia Francês
            </span>
          </div>

          {/* Info e Senso de Comunidade */}
          <div className="space-y-1 text-xs md:text-sm opacity-60">
            <p className="uppercase tracking-widest">Atualizações toda sexta-feira</p>
            <p>Textos em domínio público.</p>
            <p className="font-semibold opacity-100 pt-1 italic">
              Curadoria: João Victor Davies
            </p>
          </div>

          {/* Aba de Instalação (Retangular e maior) */}
          <nav className="pt-4">
            <Link 
              href="/instalar"
              className={`text-xs uppercase tracking-widest px-8 py-4 border rounded-none transition-all inline-block ${isDarkMode ? 'border-white/20 hover:border-white text-white hover:bg-white hover:text-black' : 'border-black/10 hover:border-black text-black hover:bg-black hover:text-white'}`}
            >
              Usar como aplicativo
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
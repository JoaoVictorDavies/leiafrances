import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col items-center justify-between p-6 md:p-12 font-serif">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
        <header className="mb-16 text-center">
          <h1 className="text-5xl md:text-7xl font-light tracking-tighter italic">
            Leia Francês
          </h1>
        </header>

        <nav className="flex flex-col gap-4 w-full max-w-sm">
          <Link
            href="/poemas"
            className="group relative px-8 py-5 border border-[#1c1917]/20 rounded-none text-center text-xl transition-all duration-500 hover:border-[#1c1917] hover:bg-[#1c1917] hover:text-[#fafaf9]"
          >
            Poemas clássicos
          </Link>
          
          <Link
            href="/filosofia"
            className="group relative px-8 py-5 border border-[#1c1917]/20 rounded-none text-center text-xl transition-all duration-500 hover:border-[#1c1917] hover:bg-[#1c1917] hover:text-[#fafaf9]"
          >
            Frases de filosofia francesa
          </Link>
        </nav>
      </div>

      <footer className="w-full max-w-xl text-center border-t border-[#1c1917]/10 pt-8 pb-4">
        <div className="space-y-2 text-[#44403c] text-sm md:text-base leading-relaxed">
          <p>Site para ler em francês com traduções automáticas.</p>
          <p>Textos em domínio público.</p>
          <p className="font-medium pt-2">Criador: João Victor Davies.</p>
          <p className="text-xs uppercase tracking-widest opacity-60 pt-4">
            Novos textos inseridos por categoria toda sexta-feira.
          </p>
        </div>
      </footer>
    </main>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InstalarPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert('O navegador ainda não permitiu a instalação ou o app já está instalado.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      router.push('/'); // Volta para a home após instalar
    }
  };

  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      backgroundColor: '#1a1a1a', 
      color: '#fff',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Instalar Leia Francês</h1>
      <p style={{ marginBottom: '30px', opacity: 0.8 }}>
        Tenha acesso rápido e estude mesmo offline.
      </p>
      
      <button 
        onClick={handleInstall}
        style={{
          padding: '18px 40px',
          backgroundColor: '#fff',
          color: '#000',
          borderRadius: '12px',
          border: 'none',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
        }}
      >
        Confirmar Instalação
      </button>

      <button 
        onClick={() => router.push('/')}
        style={{
          marginTop: '20px',
          background: 'none',
          border: 'none',
          color: '#aaa',
          textDecoration: 'underline',
          cursor: 'pointer'
        }}
      >
        Voltar para o site
      </button>
    </div>
  );
}
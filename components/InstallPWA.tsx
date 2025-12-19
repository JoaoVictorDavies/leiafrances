'use client';

import { useEffect, useState } from 'react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Registro do Service Worker com log de erro
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW ativo no escopo:', reg.scope))
        .catch(err => console.error('Erro ao registrar SW:', err));
    }

    const handler = (e: any) => {
      console.log('Evento beforeinstallprompt disparado com sucesso!');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Log para saber se o app já está em modo standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('O app já está instalado e rodando como PWA.');
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.error('Instalação bloqueada: O evento beforeinstallprompt ainda não ocorreu.');
      alert('O navegador ainda não validou os requisitos (SW, Manifest e Ícones). Verifique o console (F12).');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowButton(false);
    }
  };

  if (!showButton) return null;

  return (
    <button onClick={handleInstall} style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '15px', backgroundColor: '#fff', color: '#000', borderRadius: '8px', fontWeight: 'bold' }}>
      Instalar App
    </button>
  );
}
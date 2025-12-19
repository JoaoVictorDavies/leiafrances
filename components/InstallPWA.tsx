'use client';

import { useEffect, useState } from 'react';

export default function InstallPWA() {
  // Estado para o fluxo Android/Desktop
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  
  // Estado para o fluxo iOS
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está instalado (Modo Standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      console.log('App já está rodando em modo standalone.');
      return; // Não faz nada se já estiver instalado
    }

    // 2. Detecção de iOS (iPhone/iPad)
    // Verifica User Agent ou se é um iPad novo (que se identifica como MacIntel mas tem touch)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOSDevice) {
      // Se for iOS, mostra o prompt manual e encerra por aqui
      setShowIOSPrompt(true);
      // Opcional: esconder após 15 segundos para não atrapalhar a leitura
      // setTimeout(() => setShowIOSPrompt(false), 15000); 
      return;
    }

    // --- FLUXO ANDROID/DESKTOP ABAIXO ---

    // 3. Registra Service Worker (apenas se não for iOS, pois iOS gerencia diferente)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // 4. Escuta o evento nativo de instalação (Android/Chrome)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAndroidInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  // --- RENDERIZAÇÃO CONDICIONAL ---

  // RENDER 1: Prompt para iOS
  if (showIOSPrompt) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '90%',
        maxWidth: '380px',
        backgroundColor: '#ffffff',
        padding: '15px 20px',
        borderRadius: '14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        color: '#000',
        fontSize: '0.9rem',
        textAlign: 'center',
        border: '1px solid #eee'
      }}>
        <p style={{ margin: 0 }}>
          <strong>Instale no iPhone/iPad:</strong><br />
          Toque no ícone de compartilhar <span style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>⎋</span> abaixo e depois em <strong>"Adicionar à Tela de Início"</strong> <span style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>➕</span>.
        </p>
        <button 
          onClick={() => setShowIOSPrompt(false)}
          style={{ marginTop: '10px', background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Fechar
        </button>
      </div>
    );
  }

  // RENDER 2: Botão para Android/Desktop
  if (showInstallButton) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '90%',
        maxWidth: '380px'
      }}>
        <button 
          onClick={handleAndroidInstallClick}
          style={{
            width: '100%',
            padding: '18px',
            backgroundColor: '#ffffff',
            color: '#000000',
            borderRadius: '14px',
            border: 'none',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          📥 Instalar Leia Francês
        </button>
      </div>
    );
  }

  // RENDER 3: Já instalado ou não suportado
  return null;
}
import './globals.css';
import InstallPWA from '../components/InstallPWA'; // Caminho para sua pasta components na raiz
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
};

export const metadata: Metadata = {
  title: 'Leia Francês',
  description: 'App de leitura em Francês',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <InstallPWA />
      </body>
    </html>
  );
}
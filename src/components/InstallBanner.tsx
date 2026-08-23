import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Download, Share, X } from 'lucide-react';
import { Condominio } from '../types';

interface InstallBannerProps {
  currentCondo: Condominio | null;
}

export default function InstallBanner({ currentCondo }: InstallBannerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  // Estado para controlar se o banner flutuante está visível
  const [isVisible, setIsVisible] = useState(true);

  const isBusinessPortal = new URLSearchParams(window.location.search).get('portal') === 'business';

  useEffect(() => {
    // 1. Detecta se já está a correr como App instalada
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    };
    setIsStandalone(checkStandalone());

    // 2. Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // 2b. Detecta se é um dispositivo móvel (o botão de instalar não faz sentido no computador)
    setIsMobileDevice(/android|iphone|ipad|ipod|mobile/.test(userAgent));

    // 3. Captura o evento de instalação (Android/PC)
    const trappedPrompt = (window as any).deferredPWA;
    if (trappedPrompt) {
      setDeferredPrompt(trappedPrompt);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPWA = e;
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      (window as any).deferredPWA = null;
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // ── MÁGICA DO MANIFESTO DINÂMICO ──
  useEffect(() => {
    if (currentCondo) {
      const urlParams = new URLSearchParams(window.location.search);
      const slug = urlParams.get('c');
      
      const startUrl = isBusinessPortal 
        ? `${window.location.origin}/?c=${slug}&portal=business` 
        : `${window.location.origin}/?c=${slug}`;

      const appFullName = isBusinessPortal ? `${currentCondo.name} | Parceiro` : `${currentCondo.name} | VIZI`;
      const appShortName = isBusinessPortal ? `VIZI Parceiro` : currentCondo.name;

      document.title = appFullName;

      const logoOriginal = currentCondo.logoUrl || '/assets/logo.png';
      const logoAbsoluto = logoOriginal.startsWith('http') ? logoOriginal : `${window.location.origin}${logoOriginal}`;

      // Injeção para o iOS (Apple)
      let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (!appleTitle) {
        appleTitle = document.createElement('meta');
        appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
        document.head.appendChild(appleTitle);
      }
      appleTitle.setAttribute('content', appShortName);

      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.setAttribute('rel', 'apple-touch-icon');
        document.head.appendChild(appleIcon);
      }
      appleIcon.setAttribute('href', logoAbsoluto);

      // Manifesto dinâmico para Android/Chrome
      const dynamicManifest = {
        name: appFullName,
        short_name: appShortName,
        start_url: startUrl,
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: isBusinessPortal ? "#0f172a" : "#ffffff",
        icons: [{ src: logoAbsoluto, sizes: "512x512", type: "image/png", purpose: "any maskable" }]
      };

      const blob = new Blob([JSON.stringify(dynamicManifest)], {type: 'application/json'});
      const manifestURL = URL.createObjectURL(blob);
      
      document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestURL;
      document.head.appendChild(link);
    }
  }, [currentCondo, isBusinessPortal]);

  const handleInstallClick = async () => {
    if (isIOS) {
      Swal.fire({
        html: `
          <div class="text-left font-sans">
            <h3 style="color:#0f172a; font-size: 18px; font-weight: 900; margin-bottom: 10px;">Instalar no iPhone</h3>
            <p style="color:#64748b; font-size: 12px; margin-bottom: 15px;">A Apple exige instalação manual:</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 16px; border: 1px solid #e2e8f0;">
              <p style="color:#334155; font-size: 11px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                1. Toque em compartilhar <span style="background: #fff; padding: 4px; border-radius: 6px; border: 1px solid #cbd5e1; display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span>
              </p>
              <p style="color:#334155; font-size: 11px; display: flex; align-items: center; gap: 8px;">
                2. Escolha <b>"Adicionar à Tela de Início"</b>
              </p>
            </div>
          </div>
        `,
        confirmButtonText: 'Entendi',
        confirmButtonColor: isBusinessPortal ? '#0f172a' : '#dc2626'
      });
      return;
    }

    const promptEvent = deferredPrompt || (window as any).deferredPWA;
    if (promptEvent) {
      promptEvent.prompt();
      await promptEvent.userChoice;
      setDeferredPrompt(null);
      (window as any).deferredPWA = null;
    } else {
      Swal.fire({
        title: 'Instalação Manual',
        html: `
          <div class="text-left font-sans">
            <p style="color:#64748b; font-size: 12px; margin-bottom: 15px;">O navegador bloqueou o atalho automático. Siga estes passos:</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 16px; border: 1px solid #e2e8f0;">
               <p style="color:#334155; font-size: 12px; margin-bottom: 10px;">1. Clique nos <b>3 pontinhos</b> (canto superior).</p>
               <p style="color:#334155; font-size: 12px;">2. Selecione <b>"Instalar Aplicativo"</b> ou <b>"Adicionar à Tela Inicial"</b>.</p>
            </div>
          </div>
        `,
        confirmButtonText: 'Entendi',
        confirmButtonColor: isBusinessPortal ? '#0f172a' : '#dc2626'
      });
    }
  };

  if (isStandalone || !currentCondo || !isVisible || !isMobileDevice) return null;

  return (
   <div className={`fixed bottom-8 right-4 md:right-8 z- w-[calc(100%-2rem)] max-w-[380px] p-4 rounded-[28px] shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10 border ${
      isBusinessPortal ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      
      {/* Botão de fechar o banner flutuante */}
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 text-slate-500 hover:text-red-500 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
      >
        <X size={16} strokeWidth={3} />
      </button>

      <div className="flex items-center gap-4 text-left">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
          isBusinessPortal ? 'bg-slate-800 border-slate-600' : 'bg-red-50 border-red-100'
        }`}>
          {isIOS 
            ? <Share className={isBusinessPortal ? 'text-white' : 'text-red-500'} size={20} /> 
            : <Download className={isBusinessPortal ? 'text-white' : 'text-red-500'} size={20} />
          }
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {isBusinessPortal ? 'Sistema Parceiro' : 'Acesso Rápido'}
          </p>
          <h4 className="text-sm font-black uppercase italic leading-none mt-1">
            Instalar {isBusinessPortal ? 'Painel' : 'Aplicativo'}
          </h4>
        </div>
      </div>
      <button 
        onClick={handleInstallClick}
        className={`px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md ${
          isBusinessPortal ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        Instalar
      </button>
    </div>
  );
}
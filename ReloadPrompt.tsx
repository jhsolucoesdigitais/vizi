import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registrado: ' + r);
    },
    onRegisterError(error: any) {
      console.log('Erro no registro do SW', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Se não houver nada para mostrar, não renderiza nada
  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-white/10 max-w-xs md:max-w-sm flex flex-col gap-4">
        
        <div className="flex items-start gap-4">
            <div className="text-2xl">
                {offlineReady ? '✅' : '🚀'}
            </div>
            <div>
                <h3 className="font-black text-sm uppercase tracking-widest mb-1">
                    {offlineReady ? 'Pronto para usar' : 'Nova Versão Disponível'}
                </h3>
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                    {offlineReady 
                        ? 'O Vizi foi salvo no seu celular e agora funciona mesmo sem internet.'
                        : 'Uma atualização importante foi lançada. Atualize para ver as novidades.'}
                </p>
            </div>
        </div>

        <div className="flex gap-2 w-full">
            {needRefresh && (
                <button 
                    onClick={() => updateServiceWorker(true)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                    Atualizar Agora
                </button>
            )}
            <button 
                onClick={close}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5"
            >
                Fechar
            </button>
        </div>

      </div>
    </div>
  );
};

export default ReloadPrompt;
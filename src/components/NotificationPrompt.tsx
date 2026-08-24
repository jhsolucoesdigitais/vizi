import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { requestPushPermission, getNotificationPermission } from '../utils/onesignal';

const DISMISS_KEY = 'vizi_notif_prompt_dismissed';

/**
 * Convite pra ativar notificações — mostrado só na tela de Histórico de Pedidos
 * (onde faz sentido: é ali que o morador acompanha o andamento). Nunca dispara
 * o pop-up nativo sozinho; só pede a permissão real quando o morador clica.
 */
export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (permission === 'unsupported' || permission === 'granted' || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  if (permission === 'denied') {
    return (
      <div className="bg-black/[0.03] rounded-2xl p-4 flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-black/[0.05] flex items-center justify-center text-ink-400 shrink-0">
          <BellOff className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-ink-700">Notificações bloqueadas</p>
          <p className="text-[11px] font-medium text-ink-400 mt-0.5">
            Pra receber avisos do seu pedido, ative manualmente nas configurações do site do seu navegador (ícone de cadeado na barra de endereço).
          </p>
        </div>
        <button onClick={handleDismiss} className="text-ink-300 hover:text-ink-500 text-[11px] font-medium shrink-0">✕</button>
      </div>
    );
  }

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 shrink-0">
        <Bell className="w-4 h-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-ink-900">Ative as notificações</p>
        <p className="text-[11px] font-medium text-ink-500 mt-0.5 mb-2.5">
          Saiba na hora quando seu pedido sair para entrega ou for concluído — sem precisar ficar abrindo o app.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setRequesting(true);
              requestPushPermission();
              // A API nativa é síncrona no callback, mas o SDK do OneSignal roda async;
              // damos um tempo curto e reconsultamos o estado real do navegador.
              setTimeout(() => { setPermission(getNotificationPermission()); setRequesting(false); }, 1200);
            }}
            disabled={requesting}
            className="bg-brand-600 text-white px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-brand-700 active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {requesting ? 'Ativando...' : 'Ativar'}
          </button>
          <button onClick={handleDismiss} className="text-ink-400 hover:text-ink-600 text-[11px] font-medium">
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

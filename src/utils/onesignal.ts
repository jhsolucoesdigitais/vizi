// Ponte com o SDK Web do OneSignal (carregado via <script> no index.html).
// O SDK expõe window.OneSignalDeferred — uma fila de callbacks executados
// assim que o SDK real terminar de carregar, então tudo aqui é assíncrono
// e nunca falha mesmo se o script ainda não tiver chegado.

import { supabase } from '../../db';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
  }
}

function withOneSignal(callback: (OneSignal: any) => void | Promise<void>) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(callback);
}

/**
 * Vincula o dispositivo ao morador logado (usuarios.id) como "external_id" no
 * OneSignal, para que o servidor consiga mandar notificação só pra ele.
 * Chamar sempre que o morador loga ou a sessão é restaurada.
 */
export function identifyResident(userId: string) {
  if (!userId) return;
  withOneSignal(async (OneSignal) => {
    await OneSignal.login(userId);
  });
}

/** Desvincula o dispositivo do morador (usar no logout). */
export function clearResidentIdentity() {
  withOneSignal(async (OneSignal) => {
    await OneSignal.logout();
  });
}

/**
 * Marca o dispositivo com o condomínio do morador — é essa tag que permite ao
 * lojista disparar uma promoção só pros moradores do próprio condomínio (via
 * filtro de tag na API da OneSignal), sem vazar pra moradores de outro lugar.
 */
export function tagResidentCondo(condominioId: string) {
  if (!condominioId) return;
  withOneSignal(async (OneSignal) => {
    await OneSignal.User.addTag('condominioId', condominioId);
  });
}

/**
 * Sincroniza usuarios.push_enabled com o estado real da permissão do navegador.
 * Chamar após conceder a permissão e também no boot do app (idempotente),
 * pra manter a contagem de "aptos a receber" no painel do lojista correta.
 */
export function syncPushEnabledFlag(userId: string) {
  if (!userId) return;
  const granted = getNotificationPermission() === 'granted';
  supabase.from('usuarios').update({ push_enabled: granted }).eq('id', userId).then(() => {});
}

/** Pede permissão de notificação ao navegador (só funciona por gesto do usuário em alguns navegadores). */
export function requestPushPermission() {
  withOneSignal(async (OneSignal) => {
    await OneSignal.Notifications.requestPermission();
  });
}

/**
 * Estado atual da permissão de notificação, direto da API nativa do navegador
 * (não depende do SDK do OneSignal ter carregado, então nunca fica "pendurado").
 * 'default' = ainda não perguntou, 'granted' = aceitou, 'denied' = bloqueou.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

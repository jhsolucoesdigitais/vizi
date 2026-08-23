// Ponte com o SDK Web do OneSignal (carregado via <script> no index.html).
// O SDK expõe window.OneSignalDeferred — uma fila de callbacks executados
// assim que o SDK real terminar de carregar, então tudo aqui é assíncrono
// e nunca falha mesmo se o script ainda não tiver chegado.

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

/** Pede permissão de notificação ao navegador (só funciona por gesto do usuário em alguns navegadores). */
export function requestPushPermission() {
  withOneSignal(async (OneSignal) => {
    await OneSignal.Notifications.requestPermission();
  });
}

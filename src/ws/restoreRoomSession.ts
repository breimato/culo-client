import {
  connectStomp,
  sendJoinRoom,
} from './stompClient';

let restoreInFlight: Promise<() => void> | null = null;
let restoreKey = '';

/**
 * Conecta STOMP, ejecuta setup de suscripciones y re-envía join con el mismo clientId.
 * Deduplica llamadas concurrentes (Bootstrap + Lobby/Game en la misma carga).
 */
export async function restoreRoomSession(
  clientId: string,
  roomCode: string,
  nick: string,
  setupSubscriptions: () => () => void,
): Promise<() => void> {
  const key = `${clientId}:${roomCode}`;
  if (restoreInFlight && restoreKey === key) {
    return restoreInFlight;
  }

  restoreKey = key;
  restoreInFlight = (async () => {
    let pageCleanup: (() => void) | undefined;

    await connectStomp(() => {
      pageCleanup = setupSubscriptions();
      sendJoinRoom(clientId, roomCode, nick);
    });

    return () => pageCleanup?.();
  })();

  try {
    return await restoreInFlight;
  } finally {
    restoreInFlight = null;
  }
}

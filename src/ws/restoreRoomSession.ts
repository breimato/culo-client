import type { RoomSessionHandlers } from './roomSessionManager';
import { acquireRoomSession } from './roomSessionManager';

/**
 * Conecta STOMP, registra handlers y re-envía join con el mismo clientId.
 */
export async function restoreRoomSession(
  clientId: string,
  roomCode: string,
  nick: string,
  handlers: RoomSessionHandlers,
): Promise<() => void> {
  return acquireRoomSession(clientId, roomCode, nick, handlers);
}

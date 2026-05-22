/** Server error codes that end the local session and send the user home. */
export const SESSION_ENDED_CODES = new Set([
  'CULO-ROOM-001',
  'CULO-ROOM-008',
  'ROOM_NOT_FOUND',
  'ROOM_EXPIRED',
  'PLAYER_NOT_IN_ROOM',
]);

export function isSessionEndedError(code: string): boolean {
  return SESSION_ENDED_CODES.has(code);
}

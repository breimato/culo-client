import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSessionEndedError } from '../constants/sessionErrors';
import { useGameStore } from '../store/gameStore';
import type { RoomClosed, WsError } from '../types/game';
import { resetRoomSession } from '../ws/roomSessionManager';
import { disconnectStomp, sendCloseRoom, sendLeaveRoom } from '../ws/stompClient';

export function useRoomExit() {
  const navigate = useNavigate();
  const clearSession = useGameStore((state) => state.clearSession);
  const setError = useGameStore((state) => state.setError);

  const exitToHome = useCallback(
    (message?: string) => {
      resetRoomSession();
      clearSession();
      disconnectStomp();
      if (message) {
        setError({ code: 'CULO-ROOM-008', message });
      }
      navigate('/', { replace: true });
    },
    [clearSession, setError, navigate],
  );

  const leaveRoom = useCallback(() => {
    const { clientId, roomCode } = useGameStore.getState();
    if (!roomCode) {
      exitToHome();
      return;
    }
    sendLeaveRoom(clientId, roomCode);
    exitToHome();
  }, [exitToHome]);

  const closeRoom = useCallback(() => {
    const confirmed = window.confirm(
      '¿Cerrar la sala para todos? Los jugadores volverán al inicio.',
    );
    if (!confirmed) {
      return;
    }

    const { clientId, roomCode } = useGameStore.getState();
    if (!roomCode) {
      return;
    }
    sendCloseRoom(clientId, roomCode);
    exitToHome('La sala ha sido cerrada');
  }, [exitToHome]);

  const handleRoomClosed = useCallback(
    (roomClosed: RoomClosed) => {
      exitToHome(roomClosed.message ?? 'La sala ha sido cerrada');
    },
    [exitToHome],
  );

  const handleSessionError = useCallback(
    (wsError: WsError) => {
      if (!isSessionEndedError(wsError.code)) {
        return false;
      }
      resetRoomSession();
      clearSession();
      setError(wsError);
      navigate('/', { replace: true });
      return true;
    },
    [clearSession, setError, navigate],
  );

  return { leaveRoom, closeRoom, handleRoomClosed, handleSessionError, exitToHome };
}

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isSessionEndedError } from '../constants/sessionErrors';
import { useStoreHydrated } from '../hooks/useStoreHydrated';
import { useGameStore } from '../store/gameStore';
import { disconnectStomp, subscribeClientTopics, subscribeRoomTopic } from '../ws/stompClient';
import { restoreRoomSession } from '../ws/restoreRoomSession';

/**
 * Si el usuario recarga en Home con sesión guardada, reconecta y redirige a lobby/game.
 */
export function SessionBootstrap() {
  const navigate = useNavigate();
  const location = useLocation();
  const hydrated = useStoreHydrated();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || startedRef.current || location.pathname !== '/') {
      return;
    }

    const { clientId, roomCode, playerId, nick, setRoomState, setHand, setError, clearSession } =
      useGameStore.getState();

    if (!roomCode || !playerId || !nick.trim()) {
      return;
    }

    startedRef.current = true;

    const run = async () => {
      try {
        await restoreRoomSession(clientId, roomCode, nick, () => {
          const unsubRoom = subscribeRoomTopic(roomCode, {
            onRoomState: (rs) => {
              setRoomState(rs);
              const path = rs.phase === 'LOBBY' ? '/lobby' : '/game';
              navigate(path, { replace: true });
            },
            onRoomClosed: () => {
              clearSession();
              disconnectStomp();
              setError({ code: 'CULO-ROOM-008', message: 'La sala ha sido cerrada' });
              navigate('/', { replace: true });
            },
          });
          const unsubClient = subscribeClientTopics(clientId, {
            onJoined: () => undefined,
            onError: (err) => {
              if (!isSessionEndedError(err.code)) {
                setError(err);
                return;
              }
              clearSession();
              disconnectStomp();
              setError(err);
              navigate('/', { replace: true });
            },
            onHandUpdate: (hu) => setHand(hu.cards),
          });
          return () => {
            unsubRoom();
            unsubClient();
          };
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo reconectar';
        setError({ code: 'CONNECTION', message });
        clearSession();
        disconnectStomp();
      }
    };

    void run();
  }, [hydrated, location.pathname, navigate]);

  return null;
}

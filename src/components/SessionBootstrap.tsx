import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStoreHydrated } from '../hooks/useStoreHydrated';
import { useGameStore } from '../store/gameStore';
import { subscribeClientTopics, subscribeRoomTopic } from '../ws/stompClient';
import { restoreRoomSession } from '../ws/restoreRoomSession';

const SESSION_ERROR_CODES = new Set(['ROOM_NOT_FOUND', 'ROOM_EXPIRED', 'PLAYER_NOT_IN_ROOM']);

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
          });
          const unsubClient = subscribeClientTopics(clientId, {
            onJoined: () => undefined,
            onError: (err) => {
              setError(err);
              if (SESSION_ERROR_CODES.has(err.code)) {
                clearSession();
                navigate('/', { replace: true });
              }
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
      }
    };

    void run();
  }, [hydrated, location.pathname, navigate]);

  return null;
}

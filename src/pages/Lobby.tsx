import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoomExitMenu } from '../components/RoomExitMenu';
import { useRoomExit } from '../hooks/useRoomExit';
import { useStoreHydrated } from '../hooks/useStoreHydrated';
import { useGameStore } from '../store/gameStore';
import { subscribeClientTopics, subscribeRoomTopic } from '../ws/stompClient';
import { restoreRoomSession } from '../ws/restoreRoomSession';

export function Lobby() {
  const navigate = useNavigate();
  const hydrated = useStoreHydrated();
  const clientId = useGameStore((state) => state.clientId);
  const playerId = useGameStore((state) => state.playerId);
  const roomCode = useGameStore((state) => state.roomCode);
  const roomState = useGameStore((state) => state.roomState);
  const setRoomState = useGameStore((state) => state.setRoomState);
  const lastError = useGameStore((state) => state.lastError);
  const setError = useGameStore((state) => state.setError);
  const { handleRoomClosed, handleSessionError } = useRoomExit();

  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const restoreCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    if (!roomCode || !playerId) {
      navigate('/');
      return;
    }

    const { nick, clientId: storedClientId } = useGameStore.getState();

    const setup = async () => {
      try {
        const cleanup = await restoreRoomSession(storedClientId, roomCode, nick, () => {
          const unsubRoom = subscribeRoomTopic(roomCode, {
            onRoomState: setRoomState,
            onRoomClosed: handleRoomClosed,
          });
          const unsubClient = subscribeClientTopics(storedClientId, {
            onJoined: () => undefined,
            onError: (err) => {
              if (handleSessionError(err)) {
                return;
              }
              setError(err);
            },
          });
          return () => {
            unsubRoom();
            unsubClient();
          };
        });
        restoreCleanupRef.current = cleanup;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo conectar';
        setError({ code: 'CONNECTION', message });
        navigate('/');
      } finally {
        setConnecting(false);
      }
    };

    void setup();

    return () => {
      restoreCleanupRef.current?.();
      restoreCleanupRef.current = null;
    };
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (roomState?.phase && roomState.phase !== 'LOBBY') {
      navigate('/game');
    }
  }, [roomState?.phase, navigate]);

  if (!hydrated || !roomCode || !playerId) return null;

  if (connecting || !roomState) {
    return (
      <div className="page lobby-page">
        <RoomExitMenu />
        <p style={{ color: 'var(--cream-muted)', textAlign: 'center' }}>
          Reconectando…
        </p>
      </div>
    );
  }

  const isHost = roomState.hostPlayerId === playerId;
  const canStart = isHost && roomState.players.length >= 2;

  const onCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onStartGame = async () => {
    setStarting(true);
    setError(null);
    try {
      const { sendStartGame } = await import('../ws/stompClient');
      sendStartGame(clientId, roomCode);
    } finally {
      setStarting(false);
    }
  };

  return (
    <motion.div
      className="page lobby-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <RoomExitMenu />
      <div className="card-panel lobby-card">
        <h1>Lobby</h1>

        {lastError && (
          <div className="error-banner">{lastError.message}</div>
        )}

        <motion.div
          className="room-code-block"
          whileTap={{ scale: 0.98 }}
          onClick={() => void onCopyCode()}
          title="Clic para copiar"
        >
          <span className="code-label">Código de sala</span>
          <span className="code-value">{roomCode}</span>
          <span className="code-hint">
            {copied ? '¡Copiado!' : 'Clic para copiar'}
          </span>
        </motion.div>

        <h2>Jugadores ({roomState.players.length})</h2>
        <ul className="player-list">
          {roomState.players.map((player) => (
            <motion.li
              key={player.id}
              className="player-item"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              layout
            >
              <span className="player-nick">{player.nick}</span>
              {player.id === roomState.hostPlayerId && (
                <span className="badge host">Host</span>
              )}
              {player.id === playerId && (
                <span className="badge you">Tú</span>
              )}
              {!player.connected && (
                <span className="badge away">Desconectado</span>
              )}
            </motion.li>
          ))}
        </ul>

        {isHost ? (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={!canStart || starting}
              onClick={() => void onStartGame()}
            >
              {starting ? 'Iniciando…' : 'Empezar partida'}
            </button>
            {!canStart && (
              <p className="hint">Se necesitan al menos 2 jugadores</p>
            )}
          </>
        ) : (
          <p className="waiting-host">Esperando al host…</p>
        )}
      </div>

      <style>{`
        .lobby-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1.5rem;
        }
        .lobby-card { width: 100%; max-width: 480px; }
        .lobby-card h1 { margin: 0 0 1rem; color: var(--gold-bright); }
        .room-code-block {
          text-align: center;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          border-radius: var(--radius);
          background: rgba(212,168,75,0.12);
          border: 2px dashed var(--gold);
          cursor: pointer;
        }
        .code-label { display: block; font-size: 0.8rem; color: var(--cream-muted); }
        .code-value {
          display: block;
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          color: var(--gold-bright);
          margin: 0.25rem 0;
        }
        .code-hint { font-size: 0.75rem; color: var(--cream-muted); }
        .player-list { list-style: none; padding: 0; margin: 0 0 1.5rem; }
        .player-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .player-nick { flex: 1; font-weight: 600; }
        .badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .badge.host { background: var(--gold); color: #1a1208; }
        .badge.you { border: 1px solid var(--gold); color: var(--gold-bright); }
        .badge.away { color: var(--cream-muted); border: 1px solid var(--cream-muted); }
        .waiting-host, .hint {
          text-align: center;
          color: var(--cream-muted);
          font-size: 0.9rem;
          margin-top: 0.75rem;
        }
        .btn-primary { width: 100%; }
      `}</style>
    </motion.div>
  );
}

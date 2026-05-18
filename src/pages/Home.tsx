import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export function Home() {
  const navigate = useNavigate();
  const clientId = useGameStore((state) => state.clientId);
  const nick = useGameStore((state) => state.nick);
  const setNick = useGameStore((state) => state.setNick);
  const setJoined = useGameStore((state) => state.setJoined);
  const setRoomState = useGameStore((state) => state.setRoomState);
  const setError = useGameStore((state) => state.setError);
  const lastError = useGameStore((state) => state.lastError);

  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoined = (roomCode: string, playerId: string) => {
    setJoined(roomCode, playerId);
    setLoading(false);
    navigate('/lobby');
  };

  const connectAndAct = async (sendMsg: () => void) => {
    if (!nick.trim()) {
      setError({ code: 'CLIENT', message: 'Introduce un nick' });
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const {
        connectStomp,
        subscribeClientTopics,
        subscribeRoomTopic,
      } = await import('../ws/stompClient');

      await connectStomp(() => {
        // subscriptions must happen here, inside onConnect
        const unsubClient = subscribeClientTopics(clientId, {
          onJoined: (joinedRoom) => {
            subscribeRoomTopic(joinedRoom.roomCode, { onRoomState: setRoomState });
            handleJoined(joinedRoom.roomCode, joinedRoom.playerId);
            unsubClient();
          },
          onError: (wsError) => {
            setError(wsError);
            setLoading(false);
            unsubClient();
          },
        });
        sendMsg();
      });
    } catch (err) {
      setLoading(false);
      const message =
        err instanceof Error ? err.message : 'No se pudo conectar al servidor';
      setError({ code: 'CONNECTION', message });
    }
  };

  const onCreateRoom = () => {
    void connectAndAct(() => {
      void import('../ws/stompClient').then(({ sendCreateRoom }) =>
        sendCreateRoom(clientId, nick.trim()),
      );
    });
  };

  const onJoinRoom = () => {
    const roomCode = roomCodeInput.trim().toUpperCase();
    if (roomCode.length !== 4) {
      setError({ code: 'CLIENT', message: 'El código debe tener 4 caracteres' });
      return;
    }
    void connectAndAct(() => {
      void import('../ws/stompClient').then(({ sendJoinRoom }) =>
        sendJoinRoom(clientId, roomCode, nick.trim()),
      );
    });
  };

  return (
    <div className="page home-page">
      <motion.div
        className="card-panel home-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="title">El Culo</h1>
        <p className="subtitle">Juego de cartas online · baraja española</p>

        {lastError && (
          <div className="error-banner">{lastError.message}</div>
        )}

        <label className="field">
          <span>Tu nick</span>
          <input
            className="input"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCreateRoom()}
            placeholder="Breixo"
            maxLength={20}
          />
        </label>

        <div className="actions">
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={onCreateRoom}
          >
            {loading ? 'Conectando…' : 'Crear sala'}
          </button>
        </div>

        <p className="divider">o únete con código</p>

        <label className="field">
          <span>Código de sala</span>
          <input
            className="input code-input"
            value={roomCodeInput}
            onChange={(e) =>
              setRoomCodeInput(e.target.value.toUpperCase().slice(0, 4))
            }
            onKeyDown={(e) => e.key === 'Enter' && onJoinRoom()}
            placeholder="AB3X"
            maxLength={4}
          />
        </label>

        <button
          type="button"
          className="btn-secondary"
          disabled={loading}
          onClick={onJoinRoom}
        >
          Unirme
        </button>
      </motion.div>

      <style>{`
        .home-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1.5rem;
        }
        .home-card { width: 100%; max-width: 420px; }
        .title {
          margin: 0 0 0.25rem;
          font-size: 2.5rem;
          color: var(--gold-bright);
          text-align: center;
        }
        .subtitle {
          margin: 0 0 1.5rem;
          text-align: center;
          color: var(--cream-muted);
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 1rem;
        }
        .field span { font-size: 0.85rem; color: var(--cream-muted); }
        .actions { margin-bottom: 1rem; }
        .actions button { width: 100%; }
        .divider {
          text-align: center;
          color: var(--cream-muted);
          font-size: 0.85rem;
          margin: 1.25rem 0;
        }
        .code-input {
          letter-spacing: 0.35em;
          text-align: center;
          font-weight: 700;
          text-transform: uppercase;
        }
        .btn-secondary { width: 100%; }
      `}</style>
    </div>
  );
}

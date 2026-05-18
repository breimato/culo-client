import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CuloSwapModal from '../components/CuloSwapModal';
import ExchangePanel from '../components/ExchangePanel';
import FlyingPlayAnimation from '../components/FlyingPlayAnimation';
import Hand from '../components/Hand';
import PlinSplash from '../components/PlinSplash';
import PlayerSlot from '../components/PlayerSlot';
import TablePile, { type TablePilePlay } from '../components/TablePile';
import { useGameStore } from '../store/gameStore';
import type { Card, PlayMade } from '../types/game';
import { isSameCard } from '../utils/cards';
import { isPlayLegal, isRoundOpen } from '../utils/gameRules';
import { mergeHandOrder, sortHandByNumber, sortHandBySuit } from '../utils/handOrder';
import {
  sendCuloSwapInitiate,
  sendCuloSwapVote,
  sendDealCards,
  sendExchangeGive,
  sendPass,
  sendPlayCards,
  subscribeClientTopics,
  subscribeRoomTopic,
} from '../ws/stompClient';
import './Game.css';

const RANK_LABEL: Record<string, string> = {
  DOS: '2',
  CUATRO: '4',
  CINCO: '5',
  SEIS: '6',
  SIETE: '7',
  SOTA: 'Sota',
  CABALLO: 'Caballo',
  REY: 'Rey',
  TRES: '3',
  AS_OTRO: 'As',
  AS_OROS: 'As de Oros',
};

const REQ_LABEL: Record<number, string> = {
  0: 'Libre',
  1: 'Sueltas',
  2: 'Pares',
  3: 'Tríos',
};

const Game: React.FC = () => {
  const navigate = useNavigate();
  const { clientId, playerId, roomCode, roomState, hand, setRoomState, setHand, setRanking, setError } =
    useGameStore();

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [centerPlay, setCenterPlay] = useState<TablePilePlay | null>(null);
  const [flyingCards, setFlyingCards] = useState<Card[] | null>(null);
  const [hiddenFromHand, setHiddenFromHand] = useState<Card[]>([]);
  const [plinSplash, setPlinSplash] = useState<{ id: number; nick: string } | null>(null);
  const [orderedHand, setOrderedHand] = useState<Card[]>([]);
  const [sortPulse, setSortPulse] = useState(0);

  const cleanupRef = useRef<(() => void)[]>([]);
  const isFlyingRef = useRef(false);
  const pileKeyRef = useRef(0);
  const lastLocalPlayRef = useRef<Card[]>([]);
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;

  const bumpPileKey = () => {
    pileKeyRef.current += 1;
    return pileKeyRef.current;
  };

  const resolveNick = (pid: string) =>
    useGameStore.getState().roomState?.players.find((p) => p.id === pid)?.nick ?? '?';

  const showTablePlay = useCallback((cards: Card[], playerNick: string) => {
    setCenterPlay({ cards, playerNick, key: bumpPileKey() });
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const showPlinSplash = useCallback((nick: string) => {
    setPlinSplash({ id: Date.now(), nick });
  }, []);

  const handlePlayMade = useCallback(
    (pm: PlayMade) => {
      const nick = resolveNick(pm.playerId);
      if (pm.plin) {
        showPlinSplash(nick);
      } else {
        const suffix = pm.isAsOros ? ' ¡As de Oros!' : '';
        showNotification(`${nick} jugó ${pm.cards.length} carta(s)${suffix}`);
      }

      if (pm.playerId === playerIdRef.current && isFlyingRef.current) {
        setFlyingCards([...lastLocalPlayRef.current]);
        return;
      }
      showTablePlay(pm.cards, nick);
    },
    [showTablePlay, showPlinSplash],
  );

  const abortPendingPlay = useCallback(() => {
    isFlyingRef.current = false;
    setFlyingCards(null);
    setHiddenFromHand([]);
    setSelectedCards([...lastLocalPlayRef.current]);
  }, []);

  const handleFlyComplete = useCallback(() => {
    setFlyingCards(null);
    isFlyingRef.current = false;
    const myNick = resolveNick(playerIdRef.current ?? '');
    showTablePlay(lastLocalPlayRef.current, myNick);
    setHiddenFromHand([]);
  }, [showTablePlay]);

  useEffect(() => {
    if (!roomCode || !playerId || !clientId) {
      navigate('/');
      return;
    }

    const unsubRoom = subscribeRoomTopic(roomCode, {
      onRoomState: (rs) => {
        setRoomState(rs);
        if (isRoundOpen(rs)) {
          setCenterPlay(null);
        }
      },
      onPlayMade: handlePlayMade,
      onRoundEnded: (re) => {
        setCenterPlay(null);
        const winnerNick = resolveNick(re.winnerPlayerId);
        showNotification(`${winnerNick} abre nueva ronda`);
      },
      onGameEnded: (ge) => {
        setRanking(ge.ranking);
        showNotification('¡Partida terminada!');
      },
      onCuloSwapRequest: () => {
        showNotification('🍑 ¡Votación de transferencia de culo!');
      },
      onCuloSwapResult: (result) => {
        if (result.accepted) {
          showNotification('✅ Transferencia aceptada');
        } else {
          showNotification('❌ Transferencia rechazada');
        }
      },
    });

    const unsubClient = subscribeClientTopics(clientId, {
      onJoined: () => {},
      onError: (err) => {
        if (isFlyingRef.current) {
          abortPendingPlay();
        }
        setError(err);
        showNotification(`Error: ${err.message}`);
      },
      onHandUpdate: (hu) => {
        setHand(hu.cards);
        setHiddenFromHand([]);
        const rs = useGameStore.getState().roomState;
        if (rs && isRoundOpen(rs)) {
          setCenterPlay(null);
        }
      },
    });

    cleanupRef.current = [unsubRoom, unsubClient];

    return () => {
      cleanupRef.current.forEach((fn) => fn());
    };
  }, [
    roomCode,
    playerId,
    clientId,
    navigate,
    setRoomState,
    setHand,
    setRanking,
    setError,
    handlePlayMade,
    abortPendingPlay,
  ]);

  useEffect(() => {
    setOrderedHand((prev) => mergeHandOrder(prev, hand));
  }, [hand]);

  if (!roomState || !playerId) {
    return (
      <motion.div className="game-loading">
        <div className="spinner" />
        <p>Conectando a la partida…</p>
      </motion.div>
    );
  }

  const myPlayer = roomState.players.find((p) => p.id === playerId);
  if (!myPlayer) {
    return (
      <div className="game-loading">
        <div className="spinner" />
        <p>Conectando a la partida…</p>
      </div>
    );
  }

  const isMyTurn = roomState.currentPlayerId === playerId;
  const isCulo = myPlayer.role === 'CULO';
  const phase = roomState.phase ?? 'LOBBY';

  const toggleCard = (card: Card) => {
    const isIn = selectedCards.some((s) => isSameCard(s, card));
    if (isIn) {
      setSelectedCards(selectedCards.filter((s) => !isSameCard(s, card)));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handlePlay = () => {
    if (selectedCards.length === 0 || !roomCode || !isPlayLegal(selectedCards, roomState)) return;
    const cards = [...selectedCards];
    lastLocalPlayRef.current = cards;
    isFlyingRef.current = true;
    setHiddenFromHand(cards);
    setSelectedCards([]);
    sendPlayCards(clientId, roomCode, cards);
  };

  const handlePass = () => {
    if (!roomCode) return;
    sendPass(clientId, roomCode);
    setSelectedCards([]);
  };

  const handleDeal = () => {
    if (!roomCode) return;
    sendDealCards(clientId, roomCode);
  };

  const handleCuloSwapInitiate = () => {
    if (!swapTarget || !roomCode) return;
    sendCuloSwapInitiate(clientId, roomCode, swapTarget);
    setSwapTarget(null);
  };

  const handleCuloSwapVote = (accept: boolean) => {
    if (!roomCode) return;
    sendCuloSwapVote(clientId, roomCode, accept);
  };

  const handleExchangeGive = (cards: Card[]) => {
    if (!roomCode) return;
    sendExchangeGive(clientId, roomCode, cards);
  };

  const otherPlayers = roomState.players.filter((p) => p.id !== playerId);

  const selectionLegal =
    selectedCards.length > 0 && isPlayLegal(selectedCards, roomState);
  const canPlay =
    isMyTurn && phase === 'PLAYING' && selectionLegal && !flyingCards && !hiddenFromHand.length;

  const displayHand = orderedHand.length > 0 ? orderedHand : hand;
  const tablePlay = isRoundOpen(roomState) ? null : centerPlay;

  const applyHandSort = (sorted: Card[]) => {
    setOrderedHand(sorted);
    setSortPulse((n) => n + 1);
  };

  // ─── DEALING phase ─────────────────────────────────────────────────────────
  if (phase === 'DEALING') {
    const canDeal =
      isCulo ||
      (roomState.hostPlayerId === playerId &&
        !roomState.players.some((p) => p.role === 'CULO'));
    const otherPlayersList = roomState.players.filter((p) => p.id !== playerId);

    return (
      <div className="game game--dealing">
        <CuloSwapModal roomState={roomState} myPlayerId={playerId} onVote={handleCuloSwapVote} />
        <h2 className="game__phase-title">Fase de Reparto</h2>
        <div className="game__players-list">
          {roomState.players.map((p) => (
            <PlayerSlot key={p.id} player={p} isCurrentPlayer={false} isMe={p.id === playerId} />
          ))}
        </div>
        {isCulo && (
          <div className="game__swap-section">
            <h3>¿Transferir culo?</h3>
            <select
              value={swapTarget ?? ''}
              onChange={(e) => setSwapTarget(e.target.value || null)}
              className="game__swap-select"
            >
              <option value="">Selecciona objetivo…</option>
              {otherPlayersList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nick}
                </option>
              ))}
            </select>
            <button
              className="btn btn--secondary"
              disabled={!swapTarget}
              onClick={handleCuloSwapInitiate}
            >
              Iniciar votación
            </button>
          </div>
        )}
        {canDeal && (
          <button className="btn btn--primary game__deal-btn" onClick={handleDeal}>
            🃏 Repartir cartas
          </button>
        )}
        {!canDeal && <p className="game__waiting">Esperando a que el culo reparta…</p>}
        {notification && <motion.div className="game__notification">{notification}</motion.div>}
      </div>
    );
  }

  // ─── EXCHANGE phase ────────────────────────────────────────────────────────
  if (phase === 'EXCHANGE') {
    return (
      <div className="game game--exchange">
        <CuloSwapModal roomState={roomState} myPlayerId={playerId} onVote={handleCuloSwapVote} />
        <ExchangePanel
          roomState={roomState}
          myPlayer={myPlayer}
          hand={hand}
          onGive={handleExchangeGive}
        />
        {notification && <motion.div className="game__notification">{notification}</motion.div>}
      </div>
    );
  }

  if (phase === 'CULO_SWAP_VOTE') {
    return (
      <div className="game">
        <CuloSwapModal roomState={roomState} myPlayerId={playerId} onVote={handleCuloSwapVote} />
        {notification && <div className="game__notification">{notification}</div>}
      </div>
    );
  }

  // ─── PLAYING phase ─────────────────────────────────────────────────────────
  return (
    <div className="game game--playing">
      {flyingCards && (
        <FlyingPlayAnimation cards={flyingCards} onComplete={handleFlyComplete} />
      )}

      <AnimatePresence>
        {plinSplash && (
          <PlinSplash
            key={plinSplash.id}
            playerNick={plinSplash.nick}
            onComplete={() => setPlinSplash(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div
            className="game__notification"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="game__players-ring">
        {otherPlayers.map((player) => (
          <PlayerSlot
            key={player.id}
            player={player}
            isCurrentPlayer={player.id === roomState.currentPlayerId}
            isMe={false}
          />
        ))}
      </div>

      <div className="game__table">
        <div className="game__round-info">
          <span>{isRoundOpen(roomState) ? 'Libre' : (REQ_LABEL[roomState.roundRequirement] ?? 'Libre')}</span>
          {!isRoundOpen(roomState) && roomState.lastRankName && (
            <span className="game__last-rank">Mínimo: {RANK_LABEL[roomState.lastRankName]}</span>
          )}
        </div>

        <TablePile play={tablePlay} />

        <PlayerSlot player={myPlayer} isCurrentPlayer={isMyTurn} isMe />
      </div>

      <div className="game__actions">
        <button className="btn btn--primary" disabled={!canPlay} onClick={handlePlay}>
          ▶ Jugar ({selectedCards.length})
        </button>
        <button
          className="btn btn--secondary"
          disabled={!isMyTurn || phase !== 'PLAYING' || !!flyingCards}
          onClick={handlePass}
        >
          ⏭ Pasar
        </button>
      </div>

      <div className="game__hand-bar">
        <div className="game__hand-sort">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => applyHandSort(sortHandByNumber(hand))}
          >
            Ordenar por número
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => applyHandSort(sortHandBySuit(hand))}
          >
            Ordenar por palo
          </button>
        </div>
        <Hand
          cards={displayHand}
          selectedCards={selectedCards}
          hiddenCards={hiddenFromHand}
          onToggleCard={toggleCard}
          onReorder={setOrderedHand}
          sortPulse={sortPulse}
          disabled={!!flyingCards}
        />
      </div>
    </div>
  );
};

export default Game;

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import CuloSwapModal from '../components/CuloSwapModal';
import ExchangePanel from '../components/ExchangePanel';
import FlyingPlayAnimation from '../components/FlyingPlayAnimation';
import Hand from '../components/Hand';
import PlinSplash from '../components/PlinSplash';
import QuadDiscardSplash from '../components/QuadDiscardSplash';
import PlayerSlot from '../components/PlayerSlot';
import TablePile, { type TablePilePlay } from '../components/TablePile';
import { useStoreHydrated } from '../hooks/useStoreHydrated';
import { useGameStore } from '../store/gameStore';
import type { Card, GamePhase, PlayMade, QuadDiscarded } from '../types/game';
import { isSameCard } from '../utils/cards';
import { isPlayLegal, isRoundOpen } from '../utils/gameRules';
import { mergeHandOrder, sortHandByNumber, sortHandBySuit } from '../utils/handOrder';
import {
  sendAck,
  sendCuloSwapInitiate,
  sendCuloSwapVote,
  sendDealCards,
  sendExchangeGive,
  sendPass,
  sendPlayCards,
  subscribeClientTopics,
  subscribeRoomTopic,
} from '../ws/stompClient';
import { restoreRoomSession } from '../ws/restoreRoomSession';

const SESSION_ERROR_CODES = new Set(['ROOM_NOT_FOUND', 'ROOM_EXPIRED', 'PLAYER_NOT_IN_ROOM']);
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

/** Pausa entre cartas en mesa y splash de PLIN. */
const PLIN_TABLE_DELAY_MS = 1000;

const Game: React.FC = () => {
  const navigate = useNavigate();
  const hydrated = useStoreHydrated();
  const { clientId, playerId, roomCode, roomState, hand, setRoomState, setHand, setRanking, setError, clearSession } =
    useGameStore();

  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [centerPile, setCenterPile] = useState<TablePilePlay[]>([]);
  const [flyingCards, setFlyingCards] = useState<Card[] | null>(null);
  const [hiddenFromHand, setHiddenFromHand] = useState<Card[]>([]);
  const [plinSplash, setPlinSplash] = useState<{ id: number; nick: string } | null>(null);
  const [orderedHand, setOrderedHand] = useState<Card[]>([]);
  const [sortPulse, setSortPulse] = useState(0);
  const [quadDiscardShow, setQuadDiscardShow] = useState<{
    id: number;
    eventId?: string;
    playerId: string;
    playerNick: string;
    value: number;
    cards: Card[];
  } | null>(null);
  const [highlightedQuadCards, setHighlightedQuadCards] = useState<Card[]>([]);

  const cleanupRef = useRef<(() => void)[]>([]);
  const isFlyingRef = useRef(false);
  const pileKeyRef = useRef(0);
  const lastLocalPlayRef = useRef<Card[]>([]);
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;
  const lastPlayIsAsOrosRef = useRef(false);
  const clearPileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quadQueueRef = useRef<QuadDiscarded[]>([]);
  const isQuadAnimatingRef = useRef(false);
  const pendingHandUpdateRef = useRef<Card[] | null>(null);
  const quadHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<GamePhase>('LOBBY');
  const playEpochRef = useRef(0);
  const pendingLocalPlayMetaRef = useRef<{ eventId?: string; plin: boolean } | null>(null);
  const localPlayOnTableRef = useRef(false);
  const plinDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpPileKey = () => {
    pileKeyRef.current += 1;
    return pileKeyRef.current;
  };

  const resolveNick = (pid: string) =>
    useGameStore.getState().roomState?.players.find((p) => p.id === pid)?.nick ?? '?';

  const clearPile = useCallback(() => {
    if (clearPileTimerRef.current) {
      clearTimeout(clearPileTimerRef.current);
      clearPileTimerRef.current = null;
    }
    lastPlayIsAsOrosRef.current = false;
    setCenterPile([]);
  }, []);

  const resetPlayVisuals = useCallback(() => {
    if (plinDelayTimerRef.current) {
      clearTimeout(plinDelayTimerRef.current);
      plinDelayTimerRef.current = null;
    }
    pendingLocalPlayMetaRef.current = null;
    localPlayOnTableRef.current = false;
    clearPile();
    setPlinSplash(null);
    setFlyingCards(null);
    isFlyingRef.current = false;
    setHiddenFromHand([]);
    setSelectedCards([]);
  }, [clearPile]);

  const scheduleClearPile = useCallback((delayMs: number) => {
    if (clearPileTimerRef.current) {
      clearTimeout(clearPileTimerRef.current);
    }
    clearPileTimerRef.current = setTimeout(() => {
      clearPileTimerRef.current = null;
      lastPlayIsAsOrosRef.current = false;
      setCenterPile([]);
    }, delayMs);
  }, []);

  const showTablePlay = useCallback((cards: Card[], playerNick: string, isAsOros = false) => {
    if (isAsOros) {
      lastPlayIsAsOrosRef.current = true;
    }
    setCenterPile((prev) => [...prev, { cards, playerNick, key: bumpPileKey(), isAsOros }]);
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const showPlinSplash = useCallback((nick: string) => {
    setPlinSplash({ id: Date.now(), nick });
  }, []);

  const ackPlayEvent = useCallback(
    (eventId?: string) => {
      const code = useGameStore.getState().roomCode;
      if (eventId && clientId && code) {
        sendAck(clientId, code, eventId);
      }
    },
    [clientId],
  );

  const schedulePlinAfterTable = useCallback(
    (nick: string, afterTable?: () => void) => {
      if (plinDelayTimerRef.current) {
        clearTimeout(plinDelayTimerRef.current);
      }
      afterTable?.();
      plinDelayTimerRef.current = window.setTimeout(() => {
        plinDelayTimerRef.current = null;
        showPlinSplash(nick);
      }, PLIN_TABLE_DELAY_MS);
    },
    [showPlinSplash],
  );

  const finishLocalPlayAck = useCallback(() => {
    const meta = pendingLocalPlayMetaRef.current;
    if (!meta || !localPlayOnTableRef.current) {
      return;
    }
    pendingLocalPlayMetaRef.current = null;
    localPlayOnTableRef.current = false;

    const myNick = resolveNick(playerIdRef.current ?? '');
    if (meta.plin) {
      schedulePlinAfterTable(myNick, () => ackPlayEvent(meta.eventId));
    } else {
      ackPlayEvent(meta.eventId);
    }
  }, [schedulePlinAfterTable, ackPlayEvent]);

  const handlePlayMade = useCallback(
    (pm: PlayMade) => {
      if (phaseRef.current !== 'PLAYING') {
        return;
      }
      const isLocal = pm.playerId === playerIdRef.current;
      if (
        !isLocal &&
        pm.playEpoch !== undefined &&
        pm.playEpoch !== playEpochRef.current
      ) {
        return;
      }

      const nick = resolveNick(pm.playerId);

      if (isLocal) {
        pendingLocalPlayMetaRef.current = { eventId: pm.eventId, plin: pm.plin };
        finishLocalPlayAck();
        return;
      }

      showTablePlay(pm.cards, nick, pm.isAsOros);

      if (pm.plin) {
        schedulePlinAfterTable(nick, () => ackPlayEvent(pm.eventId));
      } else {
        const suffix = pm.isAsOros ? ' ¡As de Oros!' : '';
        showNotification(`${nick} jugó ${pm.cards.length} carta(s)${suffix}`);
        ackPlayEvent(pm.eventId);
      }
    },
    [showTablePlay, schedulePlinAfterTable, ackPlayEvent, finishLocalPlayAck],
  );

  const abortPendingPlay = useCallback(() => {
    isFlyingRef.current = false;
    setFlyingCards(null);
    setHiddenFromHand([]);
    setSelectedCards([...lastLocalPlayRef.current]);
    pendingLocalPlayMetaRef.current = null;
    localPlayOnTableRef.current = false;
  }, []);

  const handleFlyComplete = useCallback(() => {
    setFlyingCards(null);
    isFlyingRef.current = false;
    const myNick = resolveNick(playerIdRef.current ?? '');
    const cards = lastLocalPlayRef.current;
    const isAsOros = cards.length === 1 && cards[0].number === 1 && cards[0].suit === 'OROS';
    showTablePlay(cards, myNick, isAsOros);
    setHiddenFromHand([]);
    localPlayOnTableRef.current = true;
    finishLocalPlayAck();
  }, [showTablePlay, finishLocalPlayAck]);

  const beginQuadSplash = useCallback((qd: QuadDiscarded, nick: string) => {
    const isLocal = qd.playerId === playerIdRef.current;
    if (isLocal) {
      setHiddenFromHand(qd.cards);
      setHighlightedQuadCards([]);
    }
    setQuadDiscardShow({
      id: Date.now(),
      eventId: qd.eventId,
      playerId: qd.playerId,
      playerNick: nick,
      value: qd.value,
      cards: qd.cards,
    });
  }, []);

  const startQuadDiscard = useCallback(
    (qd: QuadDiscarded) => {
      const nick = resolveNick(qd.playerId);
      const isLocal = qd.playerId === playerIdRef.current;

      if (quadHighlightTimerRef.current) {
        clearTimeout(quadHighlightTimerRef.current);
      }

      if (isLocal) {
        setHighlightedQuadCards(qd.cards);
        quadHighlightTimerRef.current = setTimeout(() => beginQuadSplash(qd, nick), 750);
      } else {
        beginQuadSplash(qd, nick);
      }
    },
    [beginQuadSplash],
  );

  const finishQuadDiscard = useCallback(() => {
    setQuadDiscardShow(null);
    setHighlightedQuadCards([]);
    setHiddenFromHand([]);

    const next = quadQueueRef.current.shift();
    if (next) {
      startQuadDiscard(next);
      return;
    }

    isQuadAnimatingRef.current = false;
    if (pendingHandUpdateRef.current) {
      setHand(pendingHandUpdateRef.current);
      pendingHandUpdateRef.current = null;
    }
  }, [setHand, startQuadDiscard]);

  const handleQuadDiscardComplete = useCallback(() => {
    const current = quadDiscardShow;
    if (current?.eventId && clientId && roomCode) {
      sendAck(clientId, roomCode, current.eventId);
    }
    finishQuadDiscard();
  }, [quadDiscardShow, clientId, roomCode, finishQuadDiscard]);

  useEffect(() => {
    if (!hydrated) return;

    if (!roomCode || !playerId || !clientId) {
      navigate('/');
      return;
    }

    const { nick } = useGameStore.getState();
    let cancelled = false;

    const setup = async () => {
      try {
        const cleanup = await restoreRoomSession(clientId, roomCode, nick, () => {
          const unsubRoom = subscribeRoomTopic(roomCode, {
            onRoomState: (rs) => {
              phaseRef.current = rs.phase;
              if (rs.playEpoch !== undefined) {
                playEpochRef.current = rs.playEpoch;
              }
              if (rs.phase !== 'PLAYING') {
                resetPlayVisuals();
              }
              setRoomState(rs);
              if (rs.phase === 'LOBBY') {
                navigate('/lobby');
              }
            },
            onPlayMade: handlePlayMade,
            onRoundEnded: (re) => {
              setPlinSplash(null);
              const winnerNick = resolveNick(re.winnerPlayerId);
              showNotification(`${winnerNick} abre nueva ronda`);
              const delay = lastPlayIsAsOrosRef.current ? 1400 : 700;
              scheduleClearPile(delay);
              if (re.eventId && clientId) {
                sendAck(clientId, roomCode, re.eventId);
              }
            },
            onRoundReset: (rr) => {
              if (rr.reason === 'AS_OROS') {
                scheduleClearPile(1400);
              } else {
                clearPile();
              }
              if (rr.eventId && clientId) {
                sendAck(clientId, roomCode, rr.eventId);
              }
            },
            onQuadDiscarded: (qd) => {
              quadQueueRef.current.push(qd);
              if (!isQuadAnimatingRef.current) {
                isQuadAnimatingRef.current = true;
                startQuadDiscard(quadQueueRef.current.shift()!);
              }
            },
            onGameEnded: (ge) => {
              resetPlayVisuals();
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
              if (SESSION_ERROR_CODES.has(err.code)) {
                clearSession();
                navigate('/');
              }
            },
            onHandUpdate: (hu) => {
              if (isQuadAnimatingRef.current) {
                pendingHandUpdateRef.current = hu.cards;
                return;
              }
              setHand(hu.cards);
              if (!isFlyingRef.current) {
                setHiddenFromHand([]);
              }
            },
          });

          return () => {
            unsubRoom();
            unsubClient();
          };
        });

        if (!cancelled) {
          cleanupRef.current = [cleanup];
        } else {
          cleanup();
        }
      } catch {
        if (!cancelled) {
          clearSession();
          navigate('/');
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
      if (clearPileTimerRef.current) {
        clearTimeout(clearPileTimerRef.current);
      }
      if (quadHighlightTimerRef.current) {
        clearTimeout(quadHighlightTimerRef.current);
      }
      if (plinDelayTimerRef.current) {
        clearTimeout(plinDelayTimerRef.current);
      }
    };
  }, [
    hydrated,
    roomCode,
    playerId,
    clientId,
    navigate,
    clearSession,
    setRoomState,
    setHand,
    setRanking,
    setError,
    handlePlayMade,
    abortPendingPlay,
    scheduleClearPile,
    clearPile,
    startQuadDiscard,
    resetPlayVisuals,
  ]);

  useEffect(() => {
    if (roomState?.phase === 'EXCHANGE') {
      setOrderedHand(sortHandByNumber(hand));
      return;
    }
    setOrderedHand((prev) => mergeHandOrder(prev, hand));
  }, [hand, roomState?.phase]);

  if (!hydrated || !roomCode || !playerId) {
    return null;
  }

  if (!roomState) {
    return (
      <motion.div className="game-loading">
        <div className="spinner" />
        <p>Reconectando a la partida…</p>
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

  const expectsHand =
    myPlayer.cardCount > 0 &&
    (roomState.phase === 'PLAYING' ||
      roomState.phase === 'EXCHANGE' ||
      roomState.phase === 'DEALING');
  if (expectsHand && hand.length === 0) {
    return (
      <motion.div className="game-loading">
        <div className="spinner" />
        <p>Sincronizando mano…</p>
      </motion.div>
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
    setFlyingCards(cards);
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
  const isQuadAnimating = !!quadDiscardShow || highlightedQuadCards.length > 0;
  const isOut = myPlayer.cardCount === 0;
  const canPlay =
    isMyTurn &&
    phase === 'PLAYING' &&
    !isOut &&
    selectionLegal &&
    !flyingCards &&
    !hiddenFromHand.length &&
    !isQuadAnimating;

  const displayHand = orderedHand.length > 0 ? orderedHand : hand;
  const tablePile = centerPile;
  const isHandAnimatingPlay = hiddenFromHand.length > 0 || !!flyingCards || isQuadAnimating;

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
      {flyingCards &&
        createPortal(
          <FlyingPlayAnimation cards={flyingCards} onComplete={handleFlyComplete} />,
          document.body,
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
        {quadDiscardShow && (
          <QuadDiscardSplash
            key={quadDiscardShow.id}
            playerNick={quadDiscardShow.playerNick}
            value={quadDiscardShow.value}
            cards={quadDiscardShow.cards}
            fromBottom={quadDiscardShow.playerId === playerId}
            onComplete={handleQuadDiscardComplete}
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

      <div className="game__opponents">
        {otherPlayers.map((player) => (
          <PlayerSlot
            key={player.id}
            player={player}
            isCurrentPlayer={player.id === roomState.currentPlayerId}
            isMe={false}
            showOpponentHand
            variant="opponent"
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

        <TablePile plays={tablePile} />
      </div>

      <div className="game__self">
        <PlayerSlot player={myPlayer} isCurrentPlayer={isMyTurn} isMe variant="self" />
      </div>

      <div className="game__actions">
        <button className="btn btn--primary" disabled={!canPlay} onClick={handlePlay}>
          ▶ Jugar ({selectedCards.length})
        </button>
        <button
          className="btn btn--secondary"
          disabled={!isMyTurn || phase !== 'PLAYING' || isOut || !!flyingCards || isQuadAnimating}
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
          highlightedCards={highlightedQuadCards}
          onToggleCard={toggleCard}
          onReorder={setOrderedHand}
          sortPulse={sortPulse}
          layoutAnimation={!isHandAnimatingPlay}
          disabled={!!flyingCards || isHandAnimatingPlay}
        />
      </div>
    </div>
  );
};

export default Game;

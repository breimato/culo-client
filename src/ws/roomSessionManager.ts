import { useGameStore } from '../store/gameStore';
import type {
  CuloSwapRequest,
  CuloSwapResult,
  GameEnded,
  HandUpdate,
  JoinedRoom,
  PlayMade,
  QuadDiscarded,
  RoomClosed,
  RoomState,
  RoundEnded,
  RoundReset,
  WsError,
} from '../types/game';
import {
  connectStomp,
  sendJoinRoom,
  subscribeClientTopics,
  subscribeRoomTopic,
} from './stompClient';

export type RoomTopicHandlers = {
  onRoomState?: (roomState: RoomState) => void;
  onPlayMade?: (playMade: PlayMade) => void;
  onRoundEnded?: (roundEnded: RoundEnded) => void;
  onRoundReset?: (roundReset: RoundReset) => void;
  onQuadDiscarded?: (quadDiscarded: QuadDiscarded) => void;
  onGameEnded?: (gameEnded: GameEnded) => void;
  onCuloSwapRequest?: (culoSwapRequest: CuloSwapRequest) => void;
  onCuloSwapResult?: (culoSwapResult: CuloSwapResult) => void;
  onRoomClosed?: (roomClosed: RoomClosed) => void;
};

export type ClientTopicHandlers = {
  onJoined?: (joinedRoom: JoinedRoom) => void;
  onError?: (wsError: WsError) => void;
  onHandUpdate?: (handUpdate: HandUpdate) => void;
};

export type RoomSessionHandlers = {
  room?: RoomTopicHandlers;
  client?: ClientTopicHandlers;
};

let refCount = 0;
let sessionKey = '';
let teardown: (() => void) | null = null;
let connectPromise: Promise<void> | null = null;

const roomHandlers: RoomTopicHandlers[] = [];
const clientHandlers: ClientTopicHandlers[] = [];

function dispatchRoom<K extends keyof RoomTopicHandlers>(
  key: K,
  payload: Parameters<NonNullable<RoomTopicHandlers[K]>>[0],
): void {
  for (const handlers of roomHandlers) {
    const handler = handlers[key];
    if (handler) {
      (handler as (arg: typeof payload) => void)(payload);
    }
  }
}

function dispatchClient<K extends keyof ClientTopicHandlers>(
  key: K,
  payload: Parameters<NonNullable<ClientTopicHandlers[K]>>[0],
): void {
  for (const handlers of clientHandlers) {
    const handler = handlers[key];
    if (handler) {
      (handler as (arg: typeof payload) => void)(payload);
    }
  }
}

function handleHandUpdate(handUpdate: HandUpdate): void {
  let handled = false;
  for (const handlers of clientHandlers) {
    if (!handlers.onHandUpdate) {
      continue;
    }
    handlers.onHandUpdate(handUpdate);
    handled = true;
  }
  if (!handled) {
    useGameStore.getState().setHand(handUpdate.cards);
  }
}

async function ensureConnected(
  clientId: string,
  roomCode: string,
  nick: string,
): Promise<void> {
  const key = `${clientId}:${roomCode}`;
  if (sessionKey === key && teardown) {
    sendJoinRoom(clientId, roomCode, nick);
    return;
  }

  if (teardown) {
    teardown();
    teardown = null;
    sessionKey = '';
    connectPromise = null;
  }

  sessionKey = key;

  connectPromise = connectStomp(() => {
    const unsubRoom = subscribeRoomTopic(roomCode, {
      onRoomState: (rs) => dispatchRoom('onRoomState', rs),
      onPlayMade: (pm) => dispatchRoom('onPlayMade', pm),
      onRoundEnded: (re) => dispatchRoom('onRoundEnded', re),
      onRoundReset: (rr) => dispatchRoom('onRoundReset', rr),
      onQuadDiscarded: (qd) => dispatchRoom('onQuadDiscarded', qd),
      onGameEnded: (ge) => dispatchRoom('onGameEnded', ge),
      onCuloSwapRequest: (req) => dispatchRoom('onCuloSwapRequest', req),
      onCuloSwapResult: (res) => dispatchRoom('onCuloSwapResult', res),
      onRoomClosed: (rc) => dispatchRoom('onRoomClosed', rc),
    });

    const unsubClient = subscribeClientTopics(clientId, {
      onJoined: (jr) => dispatchClient('onJoined', jr),
      onError: (err) => dispatchClient('onError', err),
      onHandUpdate: handleHandUpdate,
    });

    teardown = () => {
      unsubRoom();
      unsubClient();
    };

    sendJoinRoom(clientId, roomCode, nick);
  });

  await connectPromise;
}

/**
 * Mantiene suscripciones STOMP mientras haya pantallas de sala activas (lobby/game).
 * Evita que al cambiar de ruta se desmonten los topics y se pierda handUpdate.
 */
export async function acquireRoomSession(
  clientId: string,
  roomCode: string,
  nick: string,
  handlers: RoomSessionHandlers,
): Promise<() => void> {
  roomHandlers.push(handlers.room ?? {});
  clientHandlers.push(handlers.client ?? {});
  refCount++;

  await ensureConnected(clientId, roomCode, nick);

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    refCount = Math.max(0, refCount - 1);
    roomHandlers.pop();
    clientHandlers.pop();
    if (refCount === 0 && teardown) {
      teardown();
      teardown = null;
      sessionKey = '';
      connectPromise = null;
    }
  };
}

export function resetRoomSession(): void {
  refCount = 0;
  roomHandlers.length = 0;
  clientHandlers.length = 0;
  if (teardown) {
    teardown();
    teardown = null;
  }
  sessionKey = '';
  connectPromise = null;
}

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

type Registration = {
  room: RoomTopicHandlers;
  client: ClientTopicHandlers;
};

let nextRegistrationId = 0;
const registrations = new Map<number, Registration>();

let sessionKey = '';
let teardown: (() => void) | null = null;
let connectPromise: Promise<void> | null = null;

function dispatchRoom<K extends keyof RoomTopicHandlers>(
  key: K,
  payload: Parameters<NonNullable<RoomTopicHandlers[K]>>[0],
): void {
  for (const { room } of registrations.values()) {
    const handler = room[key];
    if (handler) {
      (handler as (arg: typeof payload) => void)(payload);
    }
  }
}

function dispatchClient<K extends keyof ClientTopicHandlers>(
  key: K,
  payload: Parameters<NonNullable<ClientTopicHandlers[K]>>[0],
): void {
  for (const { client } of registrations.values()) {
    const handler = client[key];
    if (handler) {
      (handler as (arg: typeof payload) => void)(payload);
    }
  }
}

function handleHandUpdate(handUpdate: HandUpdate): void {
  let handled = false;
  for (const { client } of registrations.values()) {
    if (!client.onHandUpdate) {
      continue;
    }
    client.onHandUpdate(handUpdate);
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

/** Re-solicita join + handUpdate si la sesión STOMP ya está activa. */
export function requestRoomResync(clientId: string, roomCode: string, nick: string): void {
  if (!teardown || sessionKey !== `${clientId}:${roomCode}`) {
    return;
  }
  sendJoinRoom(clientId, roomCode, nick);
}

/**
 * Mantiene suscripciones STOMP mientras haya pantallas de sala activas (lobby/game).
 * Cada acquire tiene su propio id; al liberar solo se quitan sus handlers (no el último push).
 */
export async function acquireRoomSession(
  clientId: string,
  roomCode: string,
  nick: string,
  handlers: RoomSessionHandlers,
): Promise<() => void> {
  const registrationId = ++nextRegistrationId;
  registrations.set(registrationId, {
    room: handlers.room ?? {},
    client: handlers.client ?? {},
  });

  await ensureConnected(clientId, roomCode, nick);

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    registrations.delete(registrationId);
    if (registrations.size === 0 && teardown) {
      teardown();
      teardown = null;
      sessionKey = '';
      connectPromise = null;
    }
  };
}

export function resetRoomSession(): void {
  registrations.clear();
  if (teardown) {
    teardown();
    teardown = null;
  }
  sessionKey = '';
  connectPromise = null;
}

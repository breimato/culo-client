import { Client } from '@stomp/stompjs';
import type {
  Card,
  CuloSwapRequest,
  CuloSwapResult,
  GameEnded,
  HandUpdate,
  JoinedRoom,
  PlayMade,
  RoomState,
  RoundEnded,
  TurnChanged,
  WsError,
} from '../types/game';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:8080/ws';

let stompClient: Client | null = null;

async function buildClient(): Promise<Client> {
  const { default: SockJS } = await import('sockjs-client');
  return new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: import.meta.env.DEV ? (msg) => console.debug('[STOMP]', msg) : undefined,
  });
}

/**
 * Guarantees the STOMP client is connected before resolving.
 * Calls onConnected once the underlying WS + STOMP handshake succeeds.
 */
export async function connectStomp(onConnected: () => void | Promise<void>): Promise<void> {
  if (!stompClient) {
    stompClient = await buildClient();
  }
  const client = stompClient;

  if (client.connected) {
    await onConnected();
    return;
  }

  return new Promise((resolve, reject) => {
    client.onConnect = async () => {
      try {
        await onConnected();
      } catch (err) {
        reject(err);
      }
      resolve();
    };
    client.onStompError = (frame) => {
      reject(new Error(frame.headers['message'] ?? 'STOMP error'));
    };
    if (!client.active) {
      client.activate();
    }
  });
}

export function disconnectStomp(): void {
  if (stompClient?.active) {
    stompClient.deactivate();
    stompClient = null;
  }
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export function subscribeClientTopics(
  clientId: string,
  handlers: {
    onJoined: (joinedRoom: JoinedRoom) => void;
    onError: (wsError: WsError) => void;
    onHandUpdate?: (handUpdate: HandUpdate) => void;
  },
): () => void {
  const client = stompClient!;
  const subs = [
    client.subscribe(
      `/topic/client/${clientId}/joinedRoom`,
      (msg) => handlers.onJoined(JSON.parse(msg.body) as JoinedRoom),
    ),
    client.subscribe(
      `/topic/client/${clientId}/error`,
      (msg) => handlers.onError(JSON.parse(msg.body) as WsError),
    ),
  ];
  if (handlers.onHandUpdate) {
    subs.push(
      client.subscribe(
        `/topic/client/${clientId}/handUpdate`,
        (msg) => handlers.onHandUpdate!(JSON.parse(msg.body) as HandUpdate),
      ),
    );
  }
  return () => subs.forEach((s) => s.unsubscribe());
}

export function subscribeRoomTopic(
  roomCode: string,
  handlers: {
    onRoomState: (roomState: RoomState) => void;
    onPlayMade?: (playMade: PlayMade) => void;
    onRoundEnded?: (roundEnded: RoundEnded) => void;
    onTurnChanged?: (turnChanged: TurnChanged) => void;
    onGameEnded?: (gameEnded: GameEnded) => void;
    onCuloSwapRequest?: (culoSwapRequest: CuloSwapRequest) => void;
    onCuloSwapResult?: (culoSwapResult: CuloSwapResult) => void;
  },
): () => void {
  const client = stompClient!;
  const base = `/topic/room/${roomCode}`;
  const subs = [
    client.subscribe(`${base}/roomState`, (msg) =>
      handlers.onRoomState(JSON.parse(msg.body) as RoomState),
    ),
  ];
  if (handlers.onPlayMade) {
    subs.push(
      client.subscribe(`${base}/playMade`, (msg) =>
        handlers.onPlayMade!(JSON.parse(msg.body) as PlayMade),
      ),
    );
  }
  if (handlers.onRoundEnded) {
    subs.push(
      client.subscribe(`${base}/roundEnded`, (msg) =>
        handlers.onRoundEnded!(JSON.parse(msg.body) as RoundEnded),
      ),
    );
  }
  if (handlers.onTurnChanged) {
    subs.push(
      client.subscribe(`${base}/turnChanged`, (msg) =>
        handlers.onTurnChanged!(JSON.parse(msg.body) as TurnChanged),
      ),
    );
  }
  if (handlers.onGameEnded) {
    subs.push(
      client.subscribe(`${base}/gameEnded`, (msg) =>
        handlers.onGameEnded!(JSON.parse(msg.body) as GameEnded),
      ),
    );
  }
  if (handlers.onCuloSwapRequest) {
    subs.push(
      client.subscribe(`${base}/culoSwapRequest`, (msg) =>
        handlers.onCuloSwapRequest!(JSON.parse(msg.body) as CuloSwapRequest),
      ),
    );
  }
  if (handlers.onCuloSwapResult) {
    subs.push(
      client.subscribe(`${base}/culoSwapResult`, (msg) =>
        handlers.onCuloSwapResult!(JSON.parse(msg.body) as CuloSwapResult),
      ),
    );
  }
  return () => subs.forEach((s) => s.unsubscribe());
}

// ─── Sends ───────────────────────────────────────────────────────────────────

export function sendCreateRoom(clientId: string, nick: string): void {
  stompClient!.publish({ destination: '/app/room.create', body: JSON.stringify({ clientId, nick }) });
}

export function sendJoinRoom(clientId: string, roomCode: string, nick: string): void {
  stompClient!.publish({
    destination: '/app/room.join',
    body: JSON.stringify({ clientId, roomCode: roomCode.toUpperCase(), nick }),
  });
}

export function sendStartGame(clientId: string, roomCode: string): void {
  stompClient!.publish({ destination: '/app/room.start', body: JSON.stringify({ clientId, roomCode }) });
}

export function sendDealCards(clientId: string, roomCode: string): void {
  stompClient!.publish({ destination: '/app/dealing.confirm', body: JSON.stringify({ clientId, roomCode }) });
}

export function sendPlayCards(clientId: string, roomCode: string, cards: Card[]): void {
  stompClient!.publish({ destination: '/app/game.play', body: JSON.stringify({ clientId, roomCode, cards }) });
}

export function sendPass(clientId: string, roomCode: string): void {
  stompClient!.publish({ destination: '/app/game.pass', body: JSON.stringify({ clientId, roomCode }) });
}

export function sendExchangeGive(clientId: string, roomCode: string, cards: Card[]): void {
  stompClient!.publish({ destination: '/app/exchange.give', body: JSON.stringify({ clientId, roomCode, cards }) });
}

export function sendCuloSwapInitiate(clientId: string, roomCode: string, targetPlayerId: string): void {
  stompClient!.publish({
    destination: '/app/culoSwap.initiate',
    body: JSON.stringify({ clientId, roomCode, targetPlayerId }),
  });
}

export function sendCuloSwapVote(clientId: string, roomCode: string, accept: boolean): void {
  stompClient!.publish({
    destination: '/app/culoSwap.vote',
    body: JSON.stringify({ clientId, roomCode, accept }),
  });
}

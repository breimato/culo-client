export type GamePhase =
  | 'LOBBY'
  | 'DEALING'
  | 'CULO_SWAP_VOTE'
  | 'PLAYING'
  | 'EXCHANGE'
  | 'FINISHED';

export type PlayerRole = 'NONE' | 'GANADOR' | 'SUBCAMPEON' | 'PENULTIMO' | 'CULO';

export type Suit = 'OROS' | 'COPAS' | 'ESPADAS' | 'BASTOS';

export type CardRankName =
  | 'DOS'
  | 'CUATRO'
  | 'CINCO'
  | 'SEIS'
  | 'SIETE'
  | 'SOTA'
  | 'CABALLO'
  | 'REY'
  | 'TRES'
  | 'AS_OTRO'
  | 'AS_OROS';

export interface Card {
  suit: Suit;
  number: number;
}

export interface Player {
  id: string;
  nick: string;
  connected: boolean;
  role: PlayerRole;
  cardCount: number;
}

export interface RoomState {
  roomCode: string;
  hostPlayerId: string;
  phase: GamePhase;
  players: Player[];
  currentPlayerId: string | null;
  lastPlayedCards: Card[] | null;
  roundRequirement: number;
  lastRankName: CardRankName | null;
  culoSwapInitiatorId: string | null;
  culoSwapTargetId: string | null;
}

export interface JoinedRoom {
  roomCode: string;
  playerId: string;
}

export interface HandUpdate {
  cards: Card[];
}

export interface PlayMade {
  playerId: string;
  cards: Card[];
  plin: boolean;
  isAsOros: boolean;
}

export interface RoundEnded {
  winnerPlayerId: string;
}

export interface RankingEntry {
  playerId: string;
  nick: string;
  role: PlayerRole;
}

export interface GameEnded {
  ranking: RankingEntry[];
}

export interface TurnChanged {
  currentPlayerId: string;
  roundRequirement: number;
  lastRankName: CardRankName | null;
}

export interface CuloSwapRequest {
  initiatorPlayerId: string;
  targetPlayerId: string;
}

export interface CuloSwapResult {
  accepted: boolean;
}

export interface WsError {
  code: string;
  message: string;
}

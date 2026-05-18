import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card, RankingEntry, RoomState, WsError } from '../types/game';

interface GameStore {
  clientId: string;
  nick: string;
  playerId: string | null;
  roomCode: string | null;
  roomState: RoomState | null;
  hand: Card[];
  lastError: WsError | null;
  ranking: RankingEntry[] | null;
  setNick: (nick: string) => void;
  setJoined: (roomCode: string, playerId: string) => void;
  setRoomState: (roomState: RoomState) => void;
  setHand: (hand: Card[]) => void;
  setError: (wsError: WsError | null) => void;
  setRanking: (ranking: RankingEntry[]) => void;
  reset: () => void;
}

const generateClientId = (): string => crypto.randomUUID();

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      clientId: generateClientId(),
      nick: '',
      playerId: null,
      roomCode: null,
      roomState: null,
      hand: [],
      lastError: null,
      ranking: null,
      setNick: (nick) => set({ nick }),
      setJoined: (roomCode, playerId) => set({ roomCode, playerId }),
      setRoomState: (roomState) => set({ roomState }),
      setHand: (hand) => set({ hand }),
      setError: (lastError) => set({ lastError }),
      setRanking: (ranking) => set({ ranking }),
      reset: () =>
        set({
          playerId: null,
          roomCode: null,
          roomState: null,
          hand: [],
          lastError: null,
          ranking: null,
        }),
    }),
    {
      name: 'culo-game',
      partialize: (state) => ({
        clientId: state.clientId,
        nick: state.nick,
      }),
    },
  ),
);

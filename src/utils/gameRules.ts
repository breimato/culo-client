import type { Card, CardRankName, RoomState } from '../types/game';

const RANK_POWER: Record<CardRankName, number> = {
  DOS: 1,
  CUATRO: 2,
  CINCO: 3,
  SEIS: 4,
  SIETE: 5,
  SOTA: 6,
  CABALLO: 7,
  REY: 8,
  TRES: 9,
  AS_OTRO: 10,
  AS_OROS: 11,
};

const NUMBER_TO_RANK: Record<number, CardRankName> = {
  2: 'DOS',
  3: 'TRES',
  4: 'CUATRO',
  5: 'CINCO',
  6: 'SEIS',
  7: 'SIETE',
  10: 'SOTA',
  11: 'CABALLO',
  12: 'REY',
};

export function getCardRankName(card: Card): CardRankName {
  if (card.number === 1) {
    return card.suit === 'OROS' ? 'AS_OROS' : 'AS_OTRO';
  }
  return NUMBER_TO_RANK[card.number] ?? 'DOS';
}

/** Todas las cartas seleccionadas deben tener el mismo número (1–3 cartas). */
export function isSelectionValid(cards: Card[]): boolean {
  if (cards.length === 0 || cards.length > 3) {
    return false;
  }
  const firstNumber = cards[0].number;
  return cards.every((card) => card.number === firstNumber);
}

/** Ronda abierta: sin requisito de cantidad ni rango mínimo. */
export function isRoundOpen(roomState: RoomState): boolean {
  return roomState.roundRequirement === 0 || roomState.lastRankName == null;
}

/** Réplica de RuleEngine.isLegal para validación en cliente. */
export function isPlayLegal(cards: Card[], roomState: RoomState): boolean {
  if (!isSelectionValid(cards)) {
    return false;
  }
  if (cards.length === 1 && cards[0].number === 1 && cards[0].suit === 'OROS') {
    return true;
  }
  const roundOpen = isRoundOpen(roomState);
  if (roundOpen) {
    return true;
  }
  if (cards.length !== roomState.roundRequirement) {
    return false;
  }
  const playRank = RANK_POWER[getCardRankName(cards[0])];
  const minRank = RANK_POWER[roomState.lastRankName!];
  return playRank >= minRank;
}

import type { Card, Suit } from '../types/game';
import { cardKey } from './cards';

const SUIT_ORDER: Record<Suit, number> = {
  OROS: 0,
  COPAS: 1,
  ESPADAS: 2,
  BASTOS: 3,
};

/** Orden de fuerza en mesa: As (1), Tres (3), Rey…Dos (2). */
const NUMBER_SORT_RANK: Record<number, number> = {
  1: 0,
  3: 1,
  12: 2,
  11: 3,
  10: 4,
  9: 5,
  8: 6,
  7: 7,
  6: 8,
  5: 9,
  4: 10,
  2: 11,
};

export function getNumberSortRank(number: number): number {
  return NUMBER_SORT_RANK[number] ?? number;
}

export function sortHandByNumber(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const rankA = getNumberSortRank(a.number);
    const rankB = getNumberSortRank(b.number);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  });
}

export function sortHandBySuit(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) {
      return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    }
    return getNumberSortRank(a.number) - getNumberSortRank(b.number);
  });
}

/** Mantiene el orden del usuario al recibir cartas nuevas del servidor. */
export function mergeHandOrder(previous: Card[], incoming: Card[]): Card[] {
  const incomingMap = new Map(incoming.map((card) => [cardKey(card), card]));
  const ordered: Card[] = [];

  previous.forEach((card) => {
    const key = cardKey(card);
    if (incomingMap.has(key)) {
      ordered.push(incomingMap.get(key)!);
      incomingMap.delete(key);
    }
  });

  incomingMap.forEach((card) => ordered.push(card));
  return ordered;
}

export function reorderHand(cards: Card[], fromIndex: number, toIndex: number): Card[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= cards.length || toIndex >= cards.length) {
    return cards;
  }
  const next = [...cards];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

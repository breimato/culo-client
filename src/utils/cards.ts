import type { Card } from '../types/game';

export const cardKey = (card: Card): string => `${card.suit}-${card.number}`;

export const isSameCard = (a: Card, b: Card): boolean =>
  a.suit === b.suit && a.number === b.number;

export const cardsMatch = (played: Card[], hand: Card[]): boolean =>
  played.every((p) => hand.some((h) => isSameCard(p, h)));

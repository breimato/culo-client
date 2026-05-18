import type { Card, Suit } from '../types/game';

const CARD_IMAGE_BASE = '/cards';

export function getCardImagePath(suit: Suit, number: number): string {
  return `${CARD_IMAGE_BASE}/${suit}_${number}.png`;
}

export function getCardBackPath(): string {
  return `${CARD_IMAGE_BASE}/back.png`;
}

export function getCardImagePathFromCard(card: Card): string {
  return getCardImagePath(card.suit, card.number);
}

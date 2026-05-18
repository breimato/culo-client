import type { CSSProperties } from 'react';

export interface CardFanOptions {
  /** Grados máximos de rotación en los extremos */
  rotateMaxDeg?: number;
  /** Elevación máxima de la carta central (px hacia arriba) */
  liftMaxPx?: number;
}

/** Estilo de abanico compartido (mano del jugador y reversos de rivales). */
export function getCardFanStyle(
  idx: number,
  total: number,
  options: CardFanOptions = {},
): CSSProperties {
  const rotateMax = options.rotateMaxDeg ?? 6;
  const liftMax = options.liftMaxPx ?? 42;

  const center = (total - 1) / 2;
  const maxDistance = Math.max(center, 1);
  const distanceFromCenter = Math.abs(idx - center);
  const normalizedFromCenter = total <= 1 ? 0 : (idx - center) / maxDistance;
  const edgeDistance = total <= 1 ? 0 : distanceFromCenter / maxDistance;
  const centerLift = (1 - edgeDistance * edgeDistance) * liftMax;

  return {
    '--idx': idx,
    '--total': total,
    '--fan-rotate': `${normalizedFromCenter * rotateMax}deg`,
    '--fan-lift': `-${centerLift}px`,
  } as CSSProperties;
}

/** Abanico de mano (cartas grandes). */
export const HAND_FAN_OPTIONS: CardFanOptions = {
  rotateMaxDeg: 6,
  liftMaxPx: 42,
};

/** Abanico de rivales (reversos pequeños, misma forma que la mano). */
export const OPPONENT_FAN_OPTIONS: CardFanOptions = {
  rotateMaxDeg: 6,
  liftMaxPx: 16,
};

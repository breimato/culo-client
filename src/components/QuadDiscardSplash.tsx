import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import type { Card } from '../types/game';
import CardComponent from './CardComponent';
import './QuadDiscardSplash.css';

const NUMBER_PLURAL: Record<number, string> = {
  1: 'ases',
  2: 'doses',
  3: 'treses',
  4: 'cuatros',
  5: 'cincos',
  6: 'seises',
  7: 'sietes',
  10: 'sotas',
  11: 'caballos',
  12: 'reyes',
};

export interface QuadDiscardSplashProps {
  playerNick: string;
  value: number;
  cards: Card[];
  /** Si el descarte es del jugador local, las cartas salen desde abajo */
  fromBottom: boolean;
  onComplete: () => void;
}

const cardKey = (card: Card, index: number) => `${card.suit}-${card.number}-${index}`;

const QuadDiscardSplash: React.FC<QuadDiscardSplashProps> = ({
  playerNick,
  value,
  cards,
  fromBottom,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'fly' | 'reveal' | 'exit'>('fly');
  const valueLabel = NUMBER_PLURAL[value] ?? `${value}s`;
  const originTop = fromBottom ? '82%' : '14%';

  useEffect(() => {
    const toReveal = window.setTimeout(() => setPhase('reveal'), 650);
    const toExit = window.setTimeout(() => setPhase('exit'), 2800);
    const done = window.setTimeout(() => onComplete(), 3400);
    return () => {
      window.clearTimeout(toReveal);
      window.clearTimeout(toExit);
      window.clearTimeout(done);
    };
  }, [onComplete]);

  const spread = (cards.length - 1) * 44;

  return (
    <motion.div
      className="quad-discard"
      role="status"
      aria-live="assertive"
      aria-label={`${playerNick} descarta cuádruple de ${valueLabel}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{ duration: phase === 'exit' ? 0.45 : 0.2 }}
    >
      <motion.div
        className="quad-discard__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'reveal' ? 0.72 : 0.45 }}
        transition={{ duration: 0.35 }}
      />

      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div
            className="quad-discard__banner"
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className="quad-discard__badge">Cuádruple</span>
            <h2 className="quad-discard__title">¡Descartadas!</h2>
            <p className="quad-discard__subtitle">
              <strong>{playerNick}</strong> pierde los 4 {valueLabel}
            </p>
            <p className="quad-discard__rule">4 cartas del mismo número · fuera de la mano</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="quad-discard__cards"
        animate={{
          scale: phase === 'reveal' ? 1 : phase === 'exit' ? 0.85 : 0.88,
          y: phase === 'exit' ? 120 : 0,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        {cards.map((card, index) => {
          const offsetX = -spread / 2 + index * 44;
          const startRotate = -14 + index * 8;
          const endRotate = -8 + index * 5;

          return (
            <motion.div
              key={cardKey(card, index)}
              className={`quad-discard__card${phase === 'reveal' ? ' quad-discard__card--hero' : ''}`}
              initial={{
                left: '50%',
                top: originTop,
                x: offsetX - (phase === 'reveal' ? 80 : 74),
                y: 0,
                rotate: startRotate,
                opacity: 0.6,
                scale: 0.85,
              }}
              animate={{
                left: '50%',
                top: phase === 'fly' ? '46%' : '42%',
                x: offsetX - (phase === 'reveal' ? 80 : 74),
                y: 0,
                rotate: endRotate,
                opacity: phase === 'exit' ? 0 : 1,
                scale: phase === 'reveal' ? 1.08 : 1,
                boxShadow:
                  phase === 'reveal'
                    ? '0 0 28px rgba(245, 200, 66, 0.75), 0 20px 40px rgba(0,0,0,0.5)'
                    : '0 12px 28px rgba(0,0,0,0.45)',
              }}
              transition={{
                type: 'spring',
                stiffness: phase === 'reveal' ? 280 : 200,
                damping: 22,
                delay: index * 0.07,
              }}
            >
              <CardComponent card={card} size="table" className="quad-discard__card-inner" />
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

export default QuadDiscardSplash;

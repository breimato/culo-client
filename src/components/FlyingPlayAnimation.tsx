import { motion } from 'framer-motion';
import React, { useEffect } from 'react';
import type { Card } from '../types/game';
import CardComponent from './CardComponent';
import './FlyingPlayAnimation.css';

interface FlyingPlayAnimationProps {
  cards: Card[];
  onComplete: () => void;
}

const cardKey = (card: Card, index: number) => `${card.suit}-${card.number}-${index}`;

const FlyingPlayAnimation: React.FC<FlyingPlayAnimationProps> = ({ cards, onComplete }) => {
  useEffect(() => {
    const timeout = window.setTimeout(onComplete, 520 + cards.length * 90);
    return () => window.clearTimeout(timeout);
  }, [cards, onComplete]);

  const spread = (cards.length - 1) * 28;

  return (
    <div className="flying-play" aria-hidden>
      {cards.map((card, index) => {
        const offsetX = -spread / 2 + index * 28;
        const startRotate = -12 + index * 6;
        const endRotate = -5 + index * 3;

        return (
          <motion.div
            key={cardKey(card, index)}
            className="flying-play__card"
            initial={{
              left: '50%',
              top: '88%',
              x: offsetX - 74,
              y: 0,
              scale: 1,
              rotate: startRotate,
              opacity: 1,
            }}
            animate={{
              left: '50%',
              top: '42%',
              x: offsetX - 74,
              y: 0,
              scale: 1,
              rotate: endRotate,
              opacity: 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 20,
              delay: index * 0.09,
            }}
          >
            <CardComponent card={card} size="table" className="flying-play__card-inner" />
          </motion.div>
        );
      })}
    </div>
  );
};

export default FlyingPlayAnimation;

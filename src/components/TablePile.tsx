import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import type { Card } from '../types/game';
import CardComponent from './CardComponent';
import './TablePile.css';

export interface TablePilePlay {
  cards: Card[];
  playerNick: string;
  key: number;
  isAsOros?: boolean;
}

interface TablePileProps {
  plays: TablePilePlay[];
}

const AS_OROS_GLOW = [
  '0 0 0px rgba(245,200,66,0)',
  '0 0 18px rgba(245,200,66,0.85), 0 0 32px rgba(245,200,66,0.4)',
  '0 0 0px rgba(245,200,66,0)',
];

const TablePile: React.FC<TablePileProps> = ({ plays }) => {
  const lastPlay = plays[plays.length - 1];

  return (
    <div className="table-pile">
      <AnimatePresence mode="wait">
        {plays.length === 0 ? (
          <motion.p
            key="empty"
            className="table-pile__empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Abre la ronda
          </motion.p>
        ) : (
          <motion.div
            key="pile"
            className="table-pile__content"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.8, transition: { duration: 0.4, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className="table-pile__label">Última jugada · {lastPlay.playerNick}</span>
            <motion.div className="table-pile__cards">
              {plays.map((play, playIndex) => {
                const isLast = playIndex === plays.length - 1;
                const glow = isLast && play.isAsOros;
                const baseRotate = ((playIndex * 37 + 7) % 17) - 8;
                const baseX = ((playIndex * 19 + 3) % 11) - 5;

                return play.cards.map((card, cardIndex) => {
                  const cardSpread = (cardIndex - (play.cards.length - 1) / 2) * 6;
                  return (
                    <motion.div
                      key={`${play.key}-${cardIndex}`}
                      className="table-pile__card"
                      initial={{ opacity: 0, y: -40, rotate: baseRotate - 6 }}
                      animate={{
                        opacity: 1,
                        x: baseX + cardSpread,
                        y: 0,
                        rotate: baseRotate + cardIndex * 2,
                        boxShadow: glow ? AS_OROS_GLOW : '0 0 0px rgba(0,0,0,0)',
                        transition: {
                          type: 'spring',
                          stiffness: 400,
                          damping: 22,
                          boxShadow: glow
                            ? { duration: 0.9, repeat: Infinity, repeatType: 'mirror' as const }
                            : { duration: 0 },
                        },
                      }}
                      style={{ zIndex: playIndex * 10 + cardIndex }}
                    >
                      <CardComponent card={card} size="table" />
                    </motion.div>
                  );
                });
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TablePile;

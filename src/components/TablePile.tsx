import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import type { Card } from '../types/game';
import CardComponent from './CardComponent';
import './TablePile.css';

export interface TablePilePlay {
  cards: Card[];
  playerNick: string;
  key: number;
}

interface TablePileProps {
  play: TablePilePlay | null;
}

const cardKey = (card: Card, index: number) => `${card.suit}-${card.number}-${index}`;

const TablePile: React.FC<TablePileProps> = ({ play }) => {
  return (
    <div className="table-pile">
      <AnimatePresence mode="wait">
        {!play || play.cards.length === 0 ? (
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
            key={play.key}
            className="table-pile__content"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className="table-pile__label">Última jugada · {play.playerNick}</span>
            <motion.div
              className="table-pile__cards"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.06 } },
              }}
            >
              {play.cards.map((card, index) => (
                <motion.div
                  key={cardKey(card, index)}
                  className="table-pile__card"
                  variants={{
                    hidden: { opacity: 0, y: 24, rotate: -8 + index * 4 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      rotate: -6 + index * 3,
                      transition: { type: 'spring', stiffness: 400, damping: 22 },
                    },
                  }}
                  style={{ zIndex: index }}
                >
                  <CardComponent card={card} size="table" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TablePile;

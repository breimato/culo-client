import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { getCardFanStyle, OPPONENT_FAN_OPTIONS } from '../utils/cardFan';
import CardComponent from './CardComponent';
import './OpponentCardFan.css';

/** Cartas decorativas fijas por rival (no reflejan el conteo real). */
const DECORATIVE_CARDS = 5;
const DUMMY_CARD = { suit: 'OROS' as const, number: 2 };

interface OpponentCardFanProps {
  count: number;
}

const OpponentCardFan: React.FC<OpponentCardFanProps> = ({ count }) => {
  if (count <= 0) {
    return null;
  }

  const indices = Array.from({ length: DECORATIVE_CARDS }, (_, i) => i);

  return (
    <motion.div
      className="opponent-fan"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="opponent-fan__cards">
        <AnimatePresence mode="popLayout">
          {indices.map((idx) => (
            <motion.div
              key={idx}
              className={`opponent-fan__slot${idx > 0 ? ' opponent-fan__slot--overlap' : ''}`}
              style={{ zIndex: idx + 1 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <motion.div
                className="opponent-fan__card-wrapper"
                style={getCardFanStyle(idx, DECORATIVE_CARDS, OPPONENT_FAN_OPTIONS)}
              >
                <CardComponent card={DUMMY_CARD} size="opponent" faceDown />
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default OpponentCardFan;

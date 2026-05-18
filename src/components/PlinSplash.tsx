import { motion } from 'framer-motion';
import React, { useEffect } from 'react';
import './PlinSplash.css';

interface PlinSplashProps {
  playerNick: string;
  onComplete?: () => void;
}

const PlinSplash: React.FC<PlinSplashProps> = ({ playerNick, onComplete }) => {
  useEffect(() => {
    const timeout = window.setTimeout(() => onComplete?.(), 1650);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return (
    <motion.div
      className="plin-splash"
      role="status"
      aria-live="assertive"
      aria-label={`Plin de ${playerNick}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08 }}
    >
      <motion.div
        className="plin-splash__flash"
        initial={{ opacity: 0.85 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />

      <motion.div
        className="plin-splash__lines"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1.6, opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        aria-hidden
      />

      <motion.div
        className="plin-splash__word"
        initial={{ scale: 0.15, opacity: 0, rotate: -8 }}
        animate={{
          scale: [0.15, 1.35, 1.05],
          opacity: [0, 1, 1],
          rotate: [-8, 2, 0],
        }}
        transition={{
          duration: 0.5,
          times: [0, 0.55, 1],
          ease: [0.12, 0.85, 0.22, 1.1],
        }}
      >
        <span className="plin-splash__text" data-text="PLIN!">
          PLIN!
        </span>
      </motion.div>

      <motion.p
        className="plin-splash__byline"
        initial={{ opacity: 0, y: 24, scale: 0.9 }}
        animate={{ opacity: [0, 1, 1, 0], y: [24, 0, 0, -8], scale: 1 }}
        transition={{ duration: 1.4, times: [0, 0.2, 0.75, 1], ease: 'easeOut' }}
      >
        {playerNick}
      </motion.p>
    </motion.div>
  );
};

export default PlinSplash;

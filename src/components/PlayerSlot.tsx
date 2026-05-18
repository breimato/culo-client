import { motion } from 'framer-motion';
import React from 'react';
import type { Player, PlayerRole } from '../types/game';
import OpponentCardFan from './OpponentCardFan';
import './PlayerSlot.css';

interface PlayerSlotProps {
  player: Player;
  isCurrentPlayer: boolean;
  isMe: boolean;
  /** Abanico de reversos (rivales) */
  showOpponentHand?: boolean;
  variant?: 'default' | 'opponent' | 'self';
}

const ROLE_LABEL: Record<PlayerRole, string> = {
  NONE: '',
  GANADOR: '🥇 Ganador',
  SUBCAMPEON: '🥈 Subcampeón',
  PENULTIMO: '😬 Penúltimo',
  CULO: '🍑 Culo',
};

const PlayerSlot: React.FC<PlayerSlotProps> = ({
  player,
  isCurrentPlayer,
  isMe,
  showOpponentHand = false,
  variant = 'default',
}) => {
  const isOpponent = variant === 'opponent';
  const isSelf = variant === 'self';

  return (
    <motion.div
      className={[
        'player-slot',
        isOpponent ? 'player-slot--opponent' : '',
        isSelf ? 'player-slot--self' : '',
        isCurrentPlayer ? 'player-slot--active' : '',
        isMe ? 'player-slot--me' : '',
        !player.connected ? 'player-slot--disconnected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="player-slot__header">
        <motion.div
          className="player-slot__avatar"
          animate={isCurrentPlayer ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={
            isCurrentPlayer
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        >
          {player.nick.slice(0, 2).toUpperCase()}
        </motion.div>
        {isCurrentPlayer && <span className="player-slot__turn-badge">Turno</span>}
      </div>

      {showOpponentHand && <OpponentCardFan count={player.cardCount} />}

      <motion.div className="player-slot__info">
        <span className="player-slot__nick">
          {player.nick}
          {isMe ? ' (tú)' : ''}
        </span>
        {!showOpponentHand && !isSelf && (
          <span className="player-slot__cards">
            {player.cardCount > 0 ? `${player.cardCount} cartas` : 'Sin cartas'}
          </span>
        )}
        {showOpponentHand && player.cardCount > 0 && (
          <span className="player-slot__cards">{player.cardCount}</span>
        )}
        {player.role !== 'NONE' && (
          <span className="player-slot__role">{ROLE_LABEL[player.role]}</span>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PlayerSlot;

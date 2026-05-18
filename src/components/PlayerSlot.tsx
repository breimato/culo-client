import React from 'react';
import type { Player, PlayerRole } from '../types/game';
import './PlayerSlot.css';

interface PlayerSlotProps {
  player: Player;
  isCurrentPlayer: boolean;
  isMe: boolean;
}

const ROLE_LABEL: Record<PlayerRole, string> = {
  NONE: '',
  GANADOR: '🥇 Ganador',
  SUBCAMPEON: '🥈 Subcampeón',
  PENULTIMO: '😬 Penúltimo',
  CULO: '🍑 Culo',
};

const PlayerSlot: React.FC<PlayerSlotProps> = ({ player, isCurrentPlayer, isMe }) => {
  return (
    <div
      className={[
        'player-slot',
        isCurrentPlayer ? 'player-slot--active' : '',
        isMe ? 'player-slot--me' : '',
        !player.connected ? 'player-slot--disconnected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="player-slot__avatar">
        {player.nick.slice(0, 2).toUpperCase()}
      </div>
      <div className="player-slot__info">
        <span className="player-slot__nick">{player.nick}{isMe ? ' (tú)' : ''}</span>
        <span className="player-slot__cards">
          {player.cardCount > 0 ? `${player.cardCount} cartas` : 'Sin cartas'}
        </span>
        {player.role !== 'NONE' && (
          <span className="player-slot__role">{ROLE_LABEL[player.role]}</span>
        )}
      </div>
      {isCurrentPlayer && <div className="player-slot__turn-arrow">▶</div>}
    </div>
  );
};

export default PlayerSlot;

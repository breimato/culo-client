import React, { useState } from 'react';
import type { Card, Player, PlayerRole, RoomState } from '../types/game';
import Hand from './Hand';
import './ExchangePanel.css';

interface ExchangePanelProps {
  roomState: RoomState;
  myPlayer: Player;
  hand: Card[];
  onGive: (cards: Card[]) => void;
}

const ROLE_INSTRUCTION: Partial<Record<PlayerRole, { count: number; receiverRole: PlayerRole; label: string }>> = {
  GANADOR: { count: 2, receiverRole: 'CULO', label: 'Elige 2 cartas para dar al Culo' },
  SUBCAMPEON: { count: 1, receiverRole: 'PENULTIMO', label: 'Elige 1 carta para dar al Penúltimo' },
};

const ExchangePanel: React.FC<ExchangePanelProps> = ({ roomState, myPlayer, hand, onGive }) => {
  const [selected, setSelected] = useState<Card[]>([]);
  const config = ROLE_INSTRUCTION[myPlayer.role];

  const toggleCard = (card: Card) => {
    if (!config) {
      return;
    }
    const isIn = selected.some((s) => s.suit === card.suit && s.number === card.number);
    if (isIn) {
      setSelected(selected.filter((s) => !(s.suit === card.suit && s.number === card.number)));
    } else if (selected.length < config.count) {
      setSelected([...selected, card]);
    }
  };

  const instruction = !config
    ? myPlayer.role === 'CULO'
      ? `${roomState.players.find((p) => p.role === 'GANADOR')?.nick ?? 'El ganador'} elige 2 cartas de su mano para darte…`
      : myPlayer.role === 'PENULTIMO'
      ? `${roomState.players.find((p) => p.role === 'SUBCAMPEON')?.nick ?? 'El subcampeón'} está eligiendo…`
      : 'Esperando al intercambio…'
    : `${config.label} (${roomState.players.find((p) => p.role === config.receiverRole)?.nick ?? '?'})`;

  const receiver = config
    ? roomState.players.find((p) => p.role === config.receiverRole)
    : undefined;
  const canConfirm = config ? selected.length === config.count : false;

  return (
    <div className="exchange-view">
      <header className="exchange-view__header">
        <h2 className="exchange-view__title">Intercambio de Cartas</h2>
        <p className="exchange-view__instruction">{instruction}</p>
      </header>

      <Hand
        className="hand--exchange"
        cards={hand}
        selectedCards={config ? selected : []}
        onToggleCard={toggleCard}
        disabled={!config}
      />

      {config && (
        <footer className="exchange-view__footer">
          <p className="exchange-view__hint">
            {selected.length} / {config.count} seleccionadas
          </p>
          <button
            className="exchange-view__btn"
            disabled={!canConfirm}
            onClick={() => onGive(selected)}
          >
            Dar cartas a {receiver?.nick ?? '?'}
          </button>
        </footer>
      )}
    </div>
  );
};

export default ExchangePanel;

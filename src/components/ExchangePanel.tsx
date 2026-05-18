import { motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import type { Card, Player, PlayerRole, RoomState } from '../types/game';
import { cardKey } from '../utils/cards';
import { sortHandByNumber } from '../utils/handOrder';
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
  const hasGiven = (roomState.exchangeDonePlayerIds ?? []).includes(myPlayer.id);

  const sortedHand = useMemo(() => sortHandByNumber(hand), [hand]);

  useEffect(() => {
    setSelected([]);
  }, [sortedHand, hasGiven]);

  const toggleCard = (card: Card) => {
    if (!config || hasGiven) {
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
    : hasGiven
      ? 'Cartas enviadas. Esperando al resto de jugadores…'
      : `${config.label} (${roomState.players.find((p) => p.role === config.receiverRole)?.nick ?? '?'})`;

  const receiver = config
    ? roomState.players.find((p) => p.role === config.receiverRole)
    : undefined;
  const canConfirm = config && !hasGiven ? selected.length === config.count : false;

  const handleGive = () => {
    if (!canConfirm) {
      return;
    }
    onGive(selected);
    setSelected([]);
  };

  return (
    <motion.div className="exchange-view">
      <header className="exchange-view__header">
        <h2 className="exchange-view__title">Intercambio de Cartas</h2>
        <p className="exchange-view__instruction">{instruction}</p>
      </header>

      {config && !hasGiven ? (
        <>
          <Hand
            key={sortedHand.map(cardKey).join('|')}
            className="hand--exchange"
            cards={sortedHand}
            selectedCards={selected}
            onToggleCard={toggleCard}
            disabled={false}
            layoutAnimation={false}
          />

          <footer className="exchange-view__footer">
            <p className="exchange-view__hint">
              {selected.length} / {config.count} seleccionadas
            </p>
            <button className="exchange-view__btn" disabled={!canConfirm} onClick={handleGive}>
              Dar cartas a {receiver?.nick ?? '?'}
            </button>
          </footer>
        </>
      ) : (
        <motion.div
          className="exchange-view__waiting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="exchange-view__waiting-pulse"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <p>
            {hasGiven
              ? 'Listo. En cuanto terminen los demás, empieza la partida.'
              : instruction}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ExchangePanel;

import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import type { RoomState } from '../types/game';
import './CuloSwapModal.css';

interface CuloSwapModalProps {
  roomState: RoomState;
  myPlayerId: string;
  onVote: (accept: boolean) => void;
}

const CuloSwapModal: React.FC<CuloSwapModalProps> = ({ roomState, myPlayerId, onVote }) => {
  const initiator = roomState.players.find((p) => p.id === roomState.culoSwapInitiatorId);
  const target = roomState.players.find((p) => p.id === roomState.culoSwapTargetId);
  const isVisible = roomState.phase === 'CULO_SWAP_VOTE';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="culo-swap-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="culo-swap-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <h2 className="culo-swap-modal__title">🍑 ¡Transferencia de Culo!</h2>
            <p className="culo-swap-modal__text">
              <strong>{initiator?.nick ?? '?'}</strong> quiere transferir el culo a{' '}
              <strong>{target?.nick ?? '?'}</strong>
            </p>
            <p className="culo-swap-modal__sub">Todos deben aceptar para que sea válido</p>
            {myPlayerId !== roomState.culoSwapInitiatorId && (
              <div className="culo-swap-modal__actions">
                <button className="btn btn--accept" onClick={() => onVote(true)}>
                  ✓ Aceptar
                </button>
                <button className="btn btn--reject" onClick={() => onVote(false)}>
                  ✗ Rechazar
                </button>
              </div>
            )}
            {myPlayerId === roomState.culoSwapInitiatorId && (
              <p className="culo-swap-modal__waiting">Esperando votos de los demás…</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CuloSwapModal;

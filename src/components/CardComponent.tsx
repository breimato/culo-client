import React from 'react';
import type { Card } from '../types/game';
import { getCardBackPath, getCardImagePathFromCard } from '../utils/cardImage';
import './CardComponent.css';

export type CardSize = 'hand' | 'table';

interface CardComponentProps {
  card: Card;
  size?: CardSize;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  className?: string;
}

const CardComponent: React.FC<CardComponentProps> = ({
  card,
  size = 'hand',
  selected = false,
  disabled = false,
  faceDown = false,
  onClick,
  className = '',
}) => {
  const src = faceDown ? getCardBackPath() : getCardImagePathFromCard(card);
  const alt = faceDown ? 'Reverso' : `${card.number} de ${card.suit}`;

  return (
    <div
      className={[
        'card',
        `card--${size}`,
        selected ? 'card--selected' : '',
        disabled ? 'card--disabled' : '',
        faceDown ? 'card--back' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={!disabled ? onClick : undefined}
      role={onClick ? 'button' : undefined}
      aria-pressed={selected}
      aria-label={alt}
    >
      <img className="card__img" src={src} alt={alt} draggable={false} />
    </div>
  );
};

export default CardComponent;

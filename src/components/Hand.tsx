import { LayoutGroup, Reorder, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import type { Card } from '../types/game';
import { cardKey, isSameCard } from '../utils/cards';
import CardComponent from './CardComponent';
import './Hand.css';

interface HandProps {
  cards: Card[];
  selectedCards: Card[];
  hiddenCards?: Card[];
  onToggleCard: (card: Card) => void;
  onReorder?: (cards: Card[]) => void;
  sortPulse?: number;
  disabled?: boolean;
  className?: string;
}

const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.82 };
const DRAG_SPRING = { type: 'spring' as const, stiffness: 520, damping: 30, mass: 0.75 };

const getFanStyle = (idx: number, total: number): React.CSSProperties => {
  const center = (total - 1) / 2;
  const maxDistance = Math.max(center, 1);
  const distanceFromCenter = Math.abs(idx - center);
  const normalizedFromCenter = total <= 1 ? 0 : (idx - center) / maxDistance;
  const edgeDistance = total <= 1 ? 0 : distanceFromCenter / maxDistance;
  const centerLift = (1 - edgeDistance * edgeDistance) * 42;

  return {
    '--idx': idx,
    '--total': total,
    '--fan-rotate': `${normalizedFromCenter * 6}deg`,
    '--fan-lift': `-${centerLift}px`,
  } as React.CSSProperties;
};

interface HandCardProps {
  card: Card;
  idx: number;
  total: number;
  selected: boolean;
  disabled: boolean;
  onToggleCard: (card: Card) => void;
  didDragRef: React.MutableRefObject<boolean>;
}

const HandCard: React.FC<HandCardProps> = ({
  card,
  idx,
  total,
  selected,
  disabled,
  onToggleCard,
  didDragRef,
}) => (
  <div className="hand__card-wrapper" style={getFanStyle(idx, total)}>
    <CardComponent
      card={card}
      size="hand"
      selected={selected}
      disabled={disabled}
      onClick={() => {
        if (!didDragRef.current) {
          onToggleCard(card);
        }
      }}
    />
  </div>
);

const Hand: React.FC<HandProps> = ({
  cards,
  selectedCards,
  hiddenCards = [],
  onToggleCard,
  onReorder,
  sortPulse = 0,
  disabled = false,
  className,
}) => {
  const [sortAnimating, setSortAnimating] = useState(false);
  const didDragRef = useRef(false);

  const hiddenSet = new Set(hiddenCards.map(cardKey));
  const visibleCards = cards.filter((c) => !hiddenSet.has(cardKey(c)));
  const canReorder = !disabled && !!onReorder;

  const isSelected = (card: Card) => selectedCards.some((s) => isSameCard(s, card));

  useEffect(() => {
    if (!sortPulse) {
      return;
    }
    setSortAnimating(true);
    const duration = 620 + visibleCards.length * 28;
    const timer = window.setTimeout(() => setSortAnimating(false), duration);
    return () => window.clearTimeout(timer);
  }, [sortPulse, visibleCards.length]);

  const handleReorder = (newOrder: Card[]) => {
    if (hiddenCards.length > 0) {
      const hiddenKeys = new Set(hiddenCards.map(cardKey));
      const hidden = cards.filter((c) => hiddenKeys.has(cardKey(c)));
      onReorder?.([...newOrder, ...hidden]);
      return;
    }
    onReorder?.(newOrder);
  };

  const handClassName = ['hand', sortAnimating ? 'hand--sorting' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  const renderSlots = (draggable: boolean) =>
    visibleCards.map((card, idx) => {
      const cardNode = (
        <HandCard
          card={card}
          idx={idx}
          total={visibleCards.length}
          selected={isSelected(card)}
          disabled={disabled}
          onToggleCard={onToggleCard}
          didDragRef={didDragRef}
        />
      );

      if (!draggable) {
        return (
          <motion.div
            key={cardKey(card)}
            layout="position"
            className={`hand__slot${idx > 0 ? ' hand__slot--overlap' : ''}`}
            style={{ zIndex: idx + 1 }}
            transition={{ layout: LAYOUT_SPRING }}
          >
            {cardNode}
          </motion.div>
        );
      }

      return (
        <Reorder.Item
          key={cardKey(card)}
          as="div"
          value={card}
          className={`hand__slot${idx > 0 ? ' hand__slot--overlap' : ''}`}
          style={{ zIndex: idx + 1 }}
          whileDrag={{
            scale: 1.06,
            zIndex: 120,
          }}
          transition={{
            layout: LAYOUT_SPRING,
            scale: DRAG_SPRING,
          }}
          onDragStart={() => {
            didDragRef.current = false;
          }}
          onDrag={() => {
            didDragRef.current = true;
          }}
          onDragEnd={() => {
            window.setTimeout(() => {
              didDragRef.current = false;
            }, 0);
          }}
        >
          {cardNode}
        </Reorder.Item>
      );
    });

  return (
    <div className="hand-viewport">
      <LayoutGroup>
        {canReorder ? (
          <Reorder.Group
            as="div"
            axis="x"
            values={visibleCards}
            onReorder={handleReorder}
            className={handClassName}
          >
            {renderSlots(true)}
          </Reorder.Group>
        ) : (
          <motion.div className={handClassName}>{renderSlots(false)}</motion.div>
        )}
      </LayoutGroup>
    </div>
  );
};

export default Hand;

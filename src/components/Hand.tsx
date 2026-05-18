import { LayoutGroup, Reorder, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import type { Card } from '../types/game';
import { cardKey, isSameCard } from '../utils/cards';
import { getCardFanStyle, HAND_FAN_OPTIONS } from '../utils/cardFan';
import CardComponent from './CardComponent';
import './Hand.css';

interface HandProps {
  cards: Card[];
  selectedCards: Card[];
  hiddenCards?: Card[];
  highlightedCards?: Card[];
  onToggleCard: (card: Card) => void;
  onReorder?: (cards: Card[]) => void;
  sortPulse?: number;
  layoutAnimation?: boolean;
  disabled?: boolean;
  className?: string;
}

const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.82 };
const DRAG_SPRING = { type: 'spring' as const, stiffness: 520, damping: 30, mass: 0.75 };

interface HandCardProps {
  card: Card;
  idx: number;
  total: number;
  selected: boolean;
  highlighted: boolean;
  disabled: boolean;
  onToggleCard: (card: Card) => void;
  didDragRef: React.MutableRefObject<boolean>;
}

const HandCard: React.FC<HandCardProps> = ({
  card,
  idx,
  total,
  selected,
  highlighted,
  disabled,
  onToggleCard,
  didDragRef,
}) => (
  <motion.div
    className={`hand__card-wrapper${highlighted ? ' hand__card-wrapper--quad' : ''}`}
    style={getCardFanStyle(idx, total, HAND_FAN_OPTIONS)}
    animate={
      highlighted
        ? { y: -18, scale: 1.06, transition: { type: 'spring', stiffness: 420, damping: 18 } }
        : undefined
    }
  >
    <CardComponent
      card={card}
      size="hand"
      selected={selected}
      highlighted={highlighted}
      disabled={disabled}
      onClick={() => {
        if (!didDragRef.current) {
          onToggleCard(card);
        }
      }}
    />
  </motion.div>
);

const Hand: React.FC<HandProps> = ({
  cards,
  selectedCards,
  hiddenCards = [],
  highlightedCards = [],
  onToggleCard,
  onReorder,
  sortPulse = 0,
  layoutAnimation = true,
  disabled = false,
  className,
}) => {
  const [sortAnimating, setSortAnimating] = useState(false);
  const didDragRef = useRef(false);

  const hiddenSet = new Set(hiddenCards.map(cardKey));
  const visibleCards = cards.filter((c) => !hiddenSet.has(cardKey(c)));
  const canReorder = !!onReorder;

  const isSelected = (card: Card) => selectedCards.some((s) => isSameCard(s, card));
  const isHighlighted = (card: Card) => highlightedCards.some((h) => isSameCard(h, card));

  useEffect(() => {
    if (!sortPulse || !layoutAnimation) {
      return;
    }
    setSortAnimating(true);
    const duration = 620 + cards.length * 28;
    const timer = window.setTimeout(() => setSortAnimating(false), duration);
    return () => window.clearTimeout(timer);
  }, [sortPulse, layoutAnimation, cards.length]);

  const handleReorder = (newOrder: Card[]) => {
    if (hiddenCards.length > 0) {
      const hiddenKeys = new Set(hiddenCards.map(cardKey));
      const hidden = cards.filter((c) => hiddenKeys.has(cardKey(c)));
      onReorder?.([...newOrder, ...hidden]);
      return;
    }
    onReorder?.(newOrder);
  };

  const handClassName = [
    'hand',
    sortAnimating ? 'hand--sorting' : '',
    !layoutAnimation ? 'hand--playing' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const layoutTransition = layoutAnimation ? LAYOUT_SPRING : { duration: 0 };

  const fanTotal = layoutAnimation ? visibleCards.length : cards.length;
  const fanIndex = (card: Card, visibleIdx: number) =>
    layoutAnimation ? visibleIdx : cards.findIndex((c) => cardKey(c) === cardKey(card));

  const renderSlots = (draggable: boolean) =>
    visibleCards.map((card, idx) => {
      const cardNode = (
        <HandCard
          card={card}
          idx={fanIndex(card, idx)}
          total={fanTotal}
          selected={isSelected(card)}
          highlighted={isHighlighted(card)}
          disabled={disabled}
          onToggleCard={onToggleCard}
          didDragRef={didDragRef}
        />
      );

      if (!draggable) {
        return (
          <motion.div
            key={cardKey(card)}
            layout={layoutAnimation ? 'position' : false}
            className={`hand__slot${idx > 0 ? ' hand__slot--overlap' : ''}`}
            style={{ zIndex: idx + 1 }}
            transition={{ layout: layoutTransition }}
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
          layout={layoutAnimation ? 'position' : undefined}
          className={`hand__slot${idx > 0 ? ' hand__slot--overlap' : ''}`}
          style={{ zIndex: idx + 1 }}
          dragListener={!disabled}
          whileDrag={
            disabled
              ? undefined
              : {
                  scale: 1.06,
                  zIndex: 120,
                }
          }
          transition={{
            layout: layoutTransition,
            scale: DRAG_SPRING,
          }}
          onDragStart={() => {
            if (disabled) return;
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

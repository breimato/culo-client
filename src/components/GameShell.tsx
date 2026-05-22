import type { ReactNode } from 'react';
import { RoomExitMenu } from './RoomExitMenu';

interface GameShellProps {
  children: ReactNode;
  className?: string;
}

/** Layout común de partida con menú de salida (UX: no tapa acciones de juego). */
export function GameShell({ children, className }: GameShellProps) {
  return (
    <div className={className}>
      <RoomExitMenu />
      {children}
    </div>
  );
}

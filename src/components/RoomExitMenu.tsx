import { useEffect, useRef, useState } from 'react';
import { useRoomExit } from '../hooks/useRoomExit';
import { useGameStore } from '../store/gameStore';
import './RoomExitMenu.css';

export function RoomExitMenu() {
  const playerId = useGameStore((state) => state.playerId);
  const roomState = useGameStore((state) => state.roomState);
  const { leaveRoom, closeRoom } = useRoomExit();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isHost = roomState?.hostPlayerId === playerId;

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div className="room-exit-menu" ref={menuRef}>
      <button
        type="button"
        className="room-exit-menu__trigger"
        aria-label="Opciones de sala"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ⋮
      </button>

      {open && (
        <div className="room-exit-menu__panel" role="menu">
          <button type="button" className="room-exit-menu__item" role="menuitem" onClick={() => leaveRoom()}>
            Salir de la sala
          </button>
          {isHost && (
            <button
              type="button"
              className="room-exit-menu__item room-exit-menu__item--danger"
              role="menuitem"
              onClick={() => closeRoom()}
            >
              Cerrar sala para todos
            </button>
          )}
        </div>
      )}
    </div>
  );
}

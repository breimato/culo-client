import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

/** Espera a que Zustand persist termine de rehidratar localStorage. */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useGameStore.persist.hasHydrated());

  useEffect(() => {
    if (useGameStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useGameStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

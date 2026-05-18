import { useEffect, useState } from 'react';

const MOBILE_HAND_MQ = '(max-width: 768px), (hover: none) and (pointer: coarse)';

/** true en móvil / pantalla táctil: scroll horizontal en lugar de drag-reorder. */
export function useMobileHandLayout(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_HAND_MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_HAND_MQ);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return mobile;
}

import { useEffect, useRef, useState } from 'react';

export default function useAuthDelay(loading, minMs = 600) {
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setDone(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDone(true), minMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, minMs]);

  return done;
}

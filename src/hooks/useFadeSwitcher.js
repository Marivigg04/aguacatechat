import { useEffect, useRef, useState } from 'react';

export default function useFadeSwitcher(duration = 350) {
  const [fadeState, setFadeState] = useState('in');
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const fadeOutThen = (cb) => {
    setFadeState('out');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      cb && cb();
      setFadeState('in');
    }, duration);
  };

  return { fadeState, fadeOutThen, setFadeState };
}

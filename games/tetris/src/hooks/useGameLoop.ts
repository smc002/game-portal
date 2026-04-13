import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function useGameLoop() {
  const tick = useGameStore((s) => s.tick);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      // 避免切后台后一次性爆 dt
      tick(Math.min(dt, 100));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);
}

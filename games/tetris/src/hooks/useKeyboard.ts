import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const DAS_MS = 167;
const ARR_MS = 33;

type RepeatKey = 'left' | 'right' | 'down';

export function useKeyboard() {
  const store = useGameStore;
  const timersRef = useRef<Record<RepeatKey, { das?: number; arr?: number }>>({
    left: {},
    right: {},
    down: {},
  });
  const heldRef = useRef<Record<RepeatKey, boolean>>({
    left: false,
    right: false,
    down: false,
  });

  useEffect(() => {
    const fire = (key: RepeatKey) => {
      const s = store.getState();
      if (key === 'left') s.moveLeft();
      else if (key === 'right') s.moveRight();
      else s.softDrop();
    };

    const startRepeat = (key: RepeatKey) => {
      if (heldRef.current[key]) return;
      heldRef.current[key] = true;
      fire(key);
      timersRef.current[key].das = window.setTimeout(() => {
        timersRef.current[key].arr = window.setInterval(() => fire(key), ARR_MS);
      }, DAS_MS);
    };

    const stopRepeat = (key: RepeatKey) => {
      heldRef.current[key] = false;
      const t = timersRef.current[key];
      if (t.das) { clearTimeout(t.das); t.das = undefined; }
      if (t.arr) { clearInterval(t.arr); t.arr = undefined; }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const s = store.getState();
      if (e.repeat) return;

      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          startRepeat('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          startRepeat('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          startRepeat('down');
          break;
        case 'ArrowUp':
        case 'KeyX':
          e.preventDefault();
          s.rotateCW();
          break;
        case 'KeyZ':
        case 'ControlLeft':
        case 'ControlRight':
          e.preventDefault();
          s.rotateCCW();
          break;
        case 'Space':
          e.preventDefault();
          s.hardDrop();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          e.preventDefault();
          s.holdPiece();
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          if (s.status === 'playing') s.pauseGame();
          else if (s.status === 'paused') s.resumeGame();
          break;
        case 'KeyR':
          e.preventDefault();
          if (s.status === 'gameover' || s.status === 'idle') s.startGame();
          break;
        case 'Enter':
          e.preventDefault();
          if (s.status === 'idle' || s.status === 'gameover') s.startGame();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
          stopRepeat('left');
          break;
        case 'ArrowRight':
          stopRepeat('right');
          break;
        case 'ArrowDown':
          stopRepeat('down');
          break;
      }
    };

    const onBlur = () => {
      stopRepeat('left');
      stopRepeat('right');
      stopRepeat('down');
      const s = store.getState();
      if (s.status === 'playing') s.pauseGame();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      stopRepeat('left');
      stopRepeat('right');
      stopRepeat('down');
    };
  }, [store]);
}

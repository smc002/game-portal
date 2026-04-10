import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

const LONG_PRESS_MS = 400;

interface Props {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: Props) {
  const [show, setShow] = useState(false);
  const [above, setAbove] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTriggered = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Decide direction: if the element's top is too close to viewport top, show below
  const updateDirection = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    // Need roughly 120px above for the tooltip
    setAbove(rect.top > 120);
  }, []);

  const handleShow = useCallback(() => {
    updateDirection();
    setShow(true);
  }, [updateDirection]);

  // Long press
  const onTouchStart = useCallback(() => {
    touchTriggered.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      touchTriggered.current = true;
      handleShow();
    }, LONG_PRESS_MS);
  }, [clearTimer, handleShow]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearTimer();
    if (touchTriggered.current) {
      e.preventDefault();
    }
  }, [clearTimer]);

  const onTouchMove = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  // Close on tap anywhere when open
  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    const id = setTimeout(() => document.addEventListener('touchstart', close, { once: true }), 50);
    return () => { clearTimeout(id); document.removeEventListener('touchstart', close); };
  }, [show]);

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#111',
    border: '1px solid var(--slot-border)',
    borderRadius: 4,
    padding: '6px 10px',
    fontSize: 11,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    minWidth: 140,
    maxWidth: 220,
    zIndex: 100,
    lineHeight: 1.4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    ...(above
      ? { bottom: '100%', marginBottom: 6 }
      : { top: '100%', marginTop: 6 }),
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleShow}
      onMouseLeave={() => setShow(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
    >
      {children}
      {show && <div style={tooltipStyle}>{content}</div>}
    </div>
  );
}

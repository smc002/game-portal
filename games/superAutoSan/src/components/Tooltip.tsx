import { useState, useRef, type ReactNode } from 'react';

interface Props {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: Props) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
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
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

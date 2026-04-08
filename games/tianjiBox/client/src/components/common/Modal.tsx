import { type ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  closable?: boolean;
}

export function Modal({ open, onClose, title, children, className = '', closable = true }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={closable ? onClose : undefined}>
      <div className={`modal-content ${className}`} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
            {closable && onClose && <button className="modal-close" onClick={onClose}>✕</button>}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

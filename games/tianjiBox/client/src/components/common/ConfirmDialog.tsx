import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  open, title = '确认', message, onConfirm, onCancel,
  confirmText = '确认', cancelText = '取消',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} closable={false}>
      <p className="confirm-message">{message}</p>
      <div className="confirm-actions">
        <button className="btn btn-cancel" onClick={onCancel}>{cancelText}</button>
        <button className="btn btn-confirm" onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  );
}

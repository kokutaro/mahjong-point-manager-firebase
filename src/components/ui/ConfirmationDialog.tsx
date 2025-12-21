import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger';
}

export const ConfirmationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title = '確認',
  message,
  confirmText = 'はい',
  cancelText = 'キャンセル',
  type = 'default'
}: ConfirmationDialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          {message.split('\n').map((line, i) => (
            <p key={i} style={{ margin: 0, lineHeight: 1.5 }}>{line}</p>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button 
            variant={type === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

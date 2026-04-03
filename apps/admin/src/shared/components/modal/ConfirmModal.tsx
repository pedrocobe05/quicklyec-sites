import { Button } from '../ui/Button';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  onClose,
  onConfirm,
  isLoading,
}: ConfirmModalProps) {
  return (
    <Modal title={title} open={open} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-sm text-slate-600">{description}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={Boolean(isLoading)} loadingLabel="Procesando...">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

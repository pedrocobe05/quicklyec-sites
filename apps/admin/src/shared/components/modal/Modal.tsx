import { PropsWithChildren, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';

interface ModalProps extends PropsWithChildren {
  title: string;
  open: boolean;
  onClose: () => void;
  description?: string;
  footer?: JSX.Element | null;
  maxWidthClassName?: string;
  dismissible?: boolean;
}

export function Modal({
  title,
  open,
  onClose,
  description,
  footer = null,
  maxWidthClassName = 'max-w-4xl',
  dismissible = true,
  children,
}: ModalProps): JSX.Element | null {
  const [isMounted, setIsMounted] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setIsClosing(false);
      return;
    }

    if (!isMounted) {
      return;
    }

    setIsClosing(true);
    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, 170);

    return () => window.clearTimeout(timeoutId);
  }, [isMounted, open]);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/18 p-4 backdrop-blur-[3px] supports-[backdrop-filter]:bg-slate-950/14',
        isClosing ? 'animate-modal-overlay-out' : 'animate-modal-overlay-in',
      ].join(' ')}
    >
      <div
        className={[
          'flex max-h-[90vh] w-full flex-col overflow-visible rounded-3xl border border-slate-200 bg-white shadow-panel shadow-slate-900/12',
          isClosing ? 'animate-modal-panel-out' : 'animate-modal-panel-in',
          maxWidthClassName,
        ].join(' ')}
      >
        <div className="relative z-0 flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          {dismissible ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-10 shrink-0 rounded-full px-0 text-lg"
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              ×
            </Button>
          ) : null}
        </div>
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-visible px-6 py-5">
          {children}
        </div>
        {footer ? (
          <div className="relative z-0 flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

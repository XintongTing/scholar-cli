import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 bg-bg-base rounded-lg shadow-lg border border-border w-full max-w-md mx-4 p-6',
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-base font-semibold text-text-primary">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded hover:bg-bg-subtle text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="关闭"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

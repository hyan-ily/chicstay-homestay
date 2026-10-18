import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLockScroll } from '../utils/helpers';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'lg',
  children,
  footer,
  closeOnBackdrop = true,
}) => {
  // Lock body & main scroll
  useLockScroll(isOpen);

  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md overscroll-contain animate-in fade-in duration-150"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-2xl w-full ${maxWidthClasses} my-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden relative isolate animate-in zoom-in-95 duration-150`}
      >
        {/* Header - cố định phía trên */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0 z-20">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 font-medium leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - cuộn độc lập bên dưới, không bao giờ che tiêu đề hay nhãn ô trên cùng */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700 overscroll-contain">
          {children}
        </div>

        {/* Footer - cố định ở đáy hộp modal */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0 z-20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

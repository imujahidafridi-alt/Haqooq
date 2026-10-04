import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '420px',
        width: 'calc(100% - 2.5rem)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        const bg = isSuccess
          ? '#F0FDF4'
          : isError
          ? '#FEF2F2'
          : '#F8FAFC';

        const border = isSuccess
          ? '#BBF7D0'
          : isError
          ? '#FECACA'
          : '#E2E8F0';

        const text = isSuccess
          ? '#166534'
          : isError
          ? '#991B1B'
          : '#1E293B';

        const iconColor = isSuccess
          ? '#16A34A'
          : isError
          ? '#DC2626'
          : '#2563EB';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: bg,
              border: `1px solid ${border}`,
              color: text,
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              animation: 'fadeIn var(--transition-fast) forwards',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {isSuccess && <CheckCircle2 size={18} color={iconColor} />}
              {isError && <AlertCircle size={18} color={iconColor} />}
              {!isSuccess && !isError && <Info size={18} color={iconColor} />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'currentColor',
                opacity: 0.6,
                display: 'flex',
                padding: '0.2rem',
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

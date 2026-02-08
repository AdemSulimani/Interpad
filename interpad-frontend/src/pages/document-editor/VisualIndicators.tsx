import './style/VisualIndicators.css';

// Auto-save Indicator
interface AutoSaveIndicatorProps {
  status: 'saving' | 'saved' | 'error' | 'idle';
  lastSaved?: string;
}

export const AutoSaveIndicator = ({ status, lastSaved }: AutoSaveIndicatorProps) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'saving':
        return {
          icon: (
            <div className="auto-save-spinner">
              <div></div>
            </div>
          ),
          text: 'Saving...',
          className: 'auto-save-saving',
        };
      case 'saved':
        return {
          icon: (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ),
          text: lastSaved ? `Saved ${lastSaved}` : 'Saved',
          className: 'auto-save-saved',
        };
      case 'error':
        return {
          icon: (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          ),
          text: 'Save failed',
          className: 'auto-save-error',
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  if (!statusInfo) return null;

  return (
    <div className={`auto-save-indicator ${statusInfo.className}`} title={statusInfo.text}>
      {statusInfo.icon}
      <span className="auto-save-text">{statusInfo.text}</span>
    </div>
  );
};

// Unsaved Changes Indicator
interface UnsavedChangesIndicatorProps {
  hasUnsavedChanges: boolean;
  showText?: boolean;
}

export const UnsavedChangesIndicator = ({ 
  hasUnsavedChanges, 
  showText = false 
}: UnsavedChangesIndicatorProps) => {
  if (!hasUnsavedChanges) return null;

  return (
    <div className="unsaved-changes-indicator" title="Unsaved changes">
      <span className="unsaved-asterisk">*</span>
      {showText && <span className="unsaved-text">Unsaved</span>}
    </div>
  );
};

// Connection Status Indicator
interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  showText?: boolean;
}

export const ConnectionStatus = ({ status, showText = false }: ConnectionStatusProps) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          ),
          text: 'Connected',
          className: 'connection-connected',
        };
      case 'disconnected':
        return {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M16.72 11.06A10 10 0 0 1 19 12.55"/>
              <path d="M5 12.55a10 10 0 0 1 5.17-2.39"/>
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
          ),
          text: 'Disconnected',
          className: 'connection-disconnected',
        };
      case 'connecting':
        return {
          icon: (
            <div className="connection-spinner">
              <div></div>
            </div>
          ),
          text: 'Connecting...',
          className: 'connection-connecting',
        };
      case 'error':
        return {
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          ),
          text: 'Connection error',
          className: 'connection-error',
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  if (!statusInfo) return null;

  return (
    <div className={`connection-status ${statusInfo.className}`} title={statusInfo.text}>
      {statusInfo.icon}
      {showText && <span className="connection-text">{statusInfo.text}</span>}
    </div>
  );
};

// Toast Notification Component
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast = ({ id, type, message, onClose }: ToastProps) => {
  const getToastIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        );
      case 'info':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        );
    }
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-icon">{getToastIcon()}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={() => onClose(id)} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  );
};


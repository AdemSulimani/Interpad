import './style/LoadingStates.css';

// Skeleton Loader for Document Loading
export const DocumentSkeletonLoader = () => {
  return (
    <div className="document-skeleton-loader">
      <div className="skeleton-header">
        <div className="skeleton-line skeleton-logo"></div>
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-line skeleton-actions"></div>
      </div>
      <div className="skeleton-toolbar">
        <div className="skeleton-line skeleton-toolbar-item"></div>
        <div className="skeleton-line skeleton-toolbar-item"></div>
        <div className="skeleton-line skeleton-toolbar-item"></div>
        <div className="skeleton-line skeleton-toolbar-item"></div>
        <div className="skeleton-line skeleton-toolbar-item"></div>
      </div>
      <div className="skeleton-content">
        <div className="skeleton-line skeleton-content-line skeleton-content-line-long"></div>
        <div className="skeleton-line skeleton-content-line skeleton-content-line-medium"></div>
        <div className="skeleton-line skeleton-content-line skeleton-content-line-short"></div>
        <div className="skeleton-line skeleton-content-line skeleton-content-line-long"></div>
        <div className="skeleton-line skeleton-content-line skeleton-content-line-medium"></div>
        <div className="skeleton-line skeleton-content-line skeleton-content-line-short"></div>
        <div className="skeleton-line skeleton-content-line skeleton-content-line-long"></div>
      </div>
    </div>
  );
};

// Save Spinner Component
interface SaveSpinnerProps {
  isSaving?: boolean;
  isSaved?: boolean;
}

export const SaveSpinner = ({ isSaving = false, isSaved = false }: SaveSpinnerProps) => {
  if (isSaved) {
    return (
      <div className="save-status save-status-saved" title="Saved">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Saved</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="save-status save-status-saving" title="Saving...">
        <div className="spinner-small"></div>
        <span>Saving...</span>
      </div>
    );
  }

  return (
    <div className="save-status save-status-unsaved" title="Unsaved changes">
      <div className="unsaved-indicator"></div>
      <span>Unsaved</span>
    </div>
  );
};

// Progress Bar for Upload
interface UploadProgressBarProps {
  progress: number; // 0-100
  fileName?: string;
  isComplete?: boolean;
  error?: string;
}

export const UploadProgressBar = ({ 
  progress, 
  fileName, 
  isComplete = false,
  error 
}: UploadProgressBarProps) => {
  if (error) {
    return (
      <div className="upload-progress-container upload-progress-error">
        <div className="upload-progress-header">
          <span className="upload-file-name">{fileName || 'File'}</span>
          <span className="upload-error-text">Error: {error}</span>
        </div>
        <div className="upload-progress-bar">
          <div className="upload-progress-fill upload-progress-fill-error" style={{ width: '100%' }}></div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="upload-progress-container upload-progress-complete">
        <div className="upload-progress-header">
          <span className="upload-file-name">{fileName || 'File'}</span>
          <span className="upload-success-text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Upload complete
          </span>
        </div>
        <div className="upload-progress-bar">
          <div className="upload-progress-fill upload-progress-fill-success" style={{ width: '100%' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-progress-container">
      <div className="upload-progress-header">
        <span className="upload-file-name">{fileName || 'Uploading...'}</span>
        <span className="upload-progress-percentage">{progress}%</span>
      </div>
      <div className="upload-progress-bar">
        <div className="upload-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};

// General Spinner Component
interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const Spinner = ({ size = 'medium', color = '#44b492' }: SpinnerProps) => {
  return (
    <div className={`spinner spinner-${size}`} style={{ borderTopColor: color }}>
      <div></div>
    </div>
  );
};


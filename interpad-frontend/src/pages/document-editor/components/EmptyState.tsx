import './EmptyState.css';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'minimal' | 'illustrated';
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) => {
  const getDefaultIcon = () => {
    if (icon) return icon;
    
    return (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-state-default-icon">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    );
  };

  return (
    <div className={`empty-state empty-state-${variant} ${className}`}>
      <div className="empty-state-content">
        {variant !== 'minimal' && (
          <div className="empty-state-icon">
            {getDefaultIcon()}
          </div>
        )}
        <h3 className="empty-state-title">{title}</h3>
        {description && (
          <p className="empty-state-description">{description}</p>
        )}
        {action && (
          <div className="empty-state-action">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

// Pre-built Empty State Components
export const EmptyDocuments = ({ action }: { action?: ReactNode }) => (
  <EmptyState
    icon={
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    }
    title="No Documents"
    description="Get started by creating your first document"
    action={action}
  />
);

export const EmptyComments = () => (
  <EmptyState
    variant="minimal"
    icon={
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    }
    title="No Comments"
    description="Add comments to collaborate with your team"
  />
);

export const EmptySearch = ({ query }: { query?: string }) => (
  <EmptyState
    icon={
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    }
    title="No Results Found"
    description={query ? `No results for "${query}"` : "Try adjusting your search terms"}
  />
);

export const EmptyOutline = () => (
  <EmptyState
    variant="minimal"
    icon={
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    }
    title="No Headings"
    description="Add headings to see the document outline"
  />
);

export const EmptyImages = ({ action }: { action?: ReactNode }) => (
  <EmptyState
    icon={
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    }
    title="No Images"
    description="Upload images to enhance your document"
    action={action}
  />
);


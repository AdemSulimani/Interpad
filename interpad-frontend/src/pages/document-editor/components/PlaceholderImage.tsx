import './PlaceholderImage.css';

interface PlaceholderImageProps {
  width?: number | string;
  height?: number | string;
  text?: string;
  variant?: 'document' | 'image' | 'avatar' | 'thumbnail' | 'banner';
  className?: string;
}

export const PlaceholderImage = ({
  width = 200,
  height = 200,
  text,
  variant = 'image',
  className = '',
}: PlaceholderImageProps) => {
  const getPlaceholderText = () => {
    if (text) return text;
    
    switch (variant) {
      case 'document':
        return 'No Document';
      case 'image':
        return 'No Image';
      case 'avatar':
        return '';
      case 'thumbnail':
        return 'No Preview';
      case 'banner':
        return 'No Banner';
      default:
        return 'Placeholder';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'document':
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        );
      case 'image':
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        );
      case 'avatar':
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        );
      case 'thumbnail':
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
        );
      case 'banner':
        return (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="14" rx="2" ry="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div className={`placeholder-image placeholder-${variant} ${className}`} style={style}>
      <div className="placeholder-content">
        {getIcon()}
        {getPlaceholderText() && (
          <span className="placeholder-text">{getPlaceholderText()}</span>
        )}
      </div>
    </div>
  );
};


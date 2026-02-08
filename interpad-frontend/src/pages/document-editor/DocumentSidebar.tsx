import { useState } from 'react';
import './style/DocumentSidebar.css';

const DocumentSidebar = () => {
  const [activeTab, setActiveTab] = useState<'outline' | 'comments' | 'info'>('outline');

  // Mock data - në realitet do të vijnë nga props ose state management
  const headings = [
    { id: 1, level: 1, text: 'Introduction', line: 1 },
    { id: 2, level: 2, text: 'Getting Started', line: 5 },
    { id: 3, level: 2, text: 'Installation', line: 12 },
    { id: 4, level: 3, text: 'Requirements', line: 15 },
    { id: 5, level: 1, text: 'Features', line: 25 },
    { id: 6, level: 2, text: 'Core Features', line: 30 },
    { id: 7, level: 2, text: 'Advanced Features', line: 45 },
  ];

  const comments = [
    { id: 1, author: 'John Doe', text: 'This section needs more details', date: '2024-01-15', line: 10 },
    { id: 2, author: 'Jane Smith', text: 'Great explanation!', date: '2024-01-16', line: 25 },
  ];

  const documentInfo = {
    author: 'John Doe',
    createdAt: '2024-01-10',
    modifiedAt: '2024-01-16',
    status: 'Draft',
    version: '1.2',
    wordCount: 1250,
    characterCount: 7850,
  };

  return (
    <aside className="document-sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'outline' ? 'active' : ''}`}
          onClick={() => setActiveTab('outline')}
          title="Outline"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>Outline</span>
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
          title="Comments"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Comments</span>
          {comments.length > 0 && <span className="tab-badge">{comments.length}</span>}
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
          title="Info"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>Info</span>
        </button>
      </div>

      <div className="sidebar-content">
        {/* Outline Tab */}
        {activeTab === 'outline' && (
          <div className="sidebar-section outline-section">
            <div className="section-header">
              <h3>Document Outline</h3>
            </div>
            <div className="outline-list">
              {headings.length > 0 ? (
                headings.map((heading) => (
                  <button
                    key={heading.id}
                    className={`outline-item outline-level-${heading.level}`}
                    onClick={() => {
                      // Scroll to heading in editor
                      console.log('Navigate to line:', heading.line);
                    }}
                  >
                    <span className="outline-text">{heading.text}</span>
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <p>No headings found</p>
                  <span>Add headings to see the outline</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="sidebar-section comments-section">
            <div className="section-header">
              <h3>Comments</h3>
              <button className="add-comment-btn" title="Add Comment">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
            <div className="comments-list">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <div className="comment-author">{comment.author}</div>
                      <div className="comment-date">{comment.date}</div>
                    </div>
                    <div className="comment-text">{comment.text}</div>
                    <div className="comment-actions">
                      <button className="comment-action-btn" title="Reply">Reply</button>
                      <button className="comment-action-btn" title="Resolve">Resolve</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No comments yet</p>
                  <span>Add comments to collaborate</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="sidebar-section info-section">
            <div className="section-header">
              <h3>Document Info</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Author</span>
                <span className="info-value">{documentInfo.author}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Created</span>
                <span className="info-value">{documentInfo.createdAt}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Modified</span>
                <span className="info-value">{documentInfo.modifiedAt}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value info-status">{documentInfo.status}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Version</span>
                <span className="info-value">{documentInfo.version}</span>
              </div>
              <div className="info-divider"></div>
              <div className="info-item">
                <span className="info-label">Words</span>
                <span className="info-value">{documentInfo.wordCount.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Characters</span>
                <span className="info-value">{documentInfo.characterCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DocumentSidebar;


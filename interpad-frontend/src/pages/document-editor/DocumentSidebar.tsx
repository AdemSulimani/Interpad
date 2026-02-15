import { useState, useMemo, useEffect, useRef } from 'react';
import './style/DocumentSidebar.css';
import { useDocumentEditor } from './context/DocumentEditorContext';
import { getDocumentContent } from './types/document';
import { useDocumentTextCounts } from './hooks/useDocumentTextCounts';
import { getDocumentComments, deleteDocumentComment, resolveDocumentComment, type AuthUser, type DocumentComment } from '../../services';

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  } catch {
    return '—';
  }
}

interface DocumentSidebarProps {
  /** Kur ndryshon, lista e komenteve rifetchet (pas shtimit të komentit të ri). */
  refreshCommentsKey?: number;
  /** Hapi 5: hap formën "Add comment" pa selection (koment i përgjithshëm). */
  onRequestAddCommentWithoutSelection?: () => void;
  /** Hapi 7: ID i komentit që duhet fokusuar (scroll në view). */
  focusedCommentId?: string | null;
  /** Thirret pasi komenti i fokusuar është shfaqur. */
  onFocusedCommentSeen?: () => void;
  /** Thirret pas fshirjes së një komenti (për të rifreskuar listën). */
  onCommentDeleted?: () => void;
}

const DocumentSidebar = ({
  refreshCommentsKey = 0,
  onRequestAddCommentWithoutSelection,
  focusedCommentId = null,
  onFocusedCommentSeen,
  onCommentDeleted,
}: DocumentSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'info'>('comments');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const commentsListRef = useRef<HTMLDivElement | null>(null);
  const { document, scrollToCommentAnchor, comments, setComments } = useDocumentEditor();
  const { wordCount, characterCount } = useDocumentTextCounts(getDocumentContent(document));

  const canScrollToAnchor = (comment: DocumentComment): boolean => {
    const a = comment.anchor;
    return (
      a != null &&
      typeof a.pageIndex === 'number' &&
      typeof a.startOffset === 'number' &&
      typeof a.endOffset === 'number'
    );
  };

  const authorName = useMemo(() => {
    try {
      const userJson = localStorage.getItem('user');
      const user = userJson ? (JSON.parse(userJson) as AuthUser) : null;
      return user?.name || user?.email || '—';
    } catch {
      return '—';
    }
  }, []);

  // Hapi 7: kur focusedCommentId ndryshon, kalojmë te Comments dhe scroll te komenti.
  useEffect(() => {
    if (!focusedCommentId) return;
    setActiveTab('comments');
    const t = requestAnimationFrame(() => {
      const list = commentsListRef.current;
      if (!list) return;
      const el = list.querySelector(`[data-comment-id="${focusedCommentId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        onFocusedCommentSeen?.();
      }
    });
    return () => cancelAnimationFrame(t);
  }, [focusedCommentId, comments, onFocusedCommentSeen]);

  useEffect(() => {
    if (!document.id) {
      setComments([]);
      setCommentsError(null);
      return;
    }
    let cancelled = false;
    setCommentsLoading(true);
    setCommentsError(null);
    getDocumentComments(document.id)
      .then((list) => {
        if (!cancelled) setComments(list);
      })
      .catch((err) => {
        if (!cancelled) setCommentsError(err instanceof Error ? err.message : 'Failed to load comments');
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document.id, refreshCommentsKey]);

  return (
    <aside className="document-sidebar">
      <div className="sidebar-tabs">
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
        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="sidebar-section comments-section">
            <div className="section-header">
              <h3>Comments</h3>
              <button
                type="button"
                className="add-comment-btn sidebar-add-comment-btn"
                title="Add comment"
                aria-label="Add comment"
                onClick={onRequestAddCommentWithoutSelection}
                disabled={!onRequestAddCommentWithoutSelection}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
            <div className="comments-list" ref={commentsListRef}>
              {commentsLoading ? (
                <div className="empty-state">
                  <p>Loading comments…</p>
                </div>
              ) : commentsError ? (
                <div className="empty-state">
                  <p>{commentsError}</p>
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className={`comment-item ${comment.resolved ? 'comment-item-resolved' : ''}`} data-comment-id={comment.id}>
                    <div className="comment-header">
                      <div className="comment-author">{comment.author?.name || comment.author?.email || '—'}</div>
                      <div className="comment-date">{formatDate(comment.createdAt)}</div>
                    </div>
                    {comment.anchor?.selectedText && (
                      <div className="comment-quote">"{comment.anchor.selectedText.slice(0, 60)}{comment.anchor.selectedText.length > 60 ? '…' : ''}"</div>
                    )}
                    <div className="comment-text">{comment.content}</div>
                    <div className="comment-actions">
                      {canScrollToAnchor(comment) && (
                        <button
                          type="button"
                          className="comment-action-btn comment-action-goto"
                          title="Go to text in document"
                          onClick={() =>
                            scrollToCommentAnchor({
                              pageIndex: comment.anchor!.pageIndex!,
                              startOffset: comment.anchor!.startOffset!,
                              endOffset: comment.anchor!.endOffset!,
                            })
                          }
                        >
                          Go to
                        </button>
                      )}
                      {document.id && (
                        comment.resolved ? (
                          <span className="comment-resolved-label">Resolved</span>
                        ) : (
                          <button
                            type="button"
                            className="comment-action-btn"
                            title="Mark as resolved"
                            disabled={resolvingId === comment.id}
                            onClick={async () => {
                              if (!document.id) return;
                              setResolvingId(comment.id);
                              try {
                                await resolveDocumentComment(document.id, comment.id, true);
                                onCommentDeleted?.();
                              } catch {
                                setResolvingId(null);
                              } finally {
                                setResolvingId(null);
                              }
                            }}
                          >
                            {resolvingId === comment.id ? '…' : 'Resolve'}
                          </button>
                        )
                      )}
                      {document.id && (
                        <button
                          type="button"
                          className="comment-action-btn comment-action-delete"
                          title="Delete comment"
                          disabled={deletingId === comment.id}
                          onClick={async () => {
                            if (!document.id) return;
                            setDeletingId(comment.id);
                            try {
                              await deleteDocumentComment(document.id, comment.id);
                              onCommentDeleted?.();
                            } catch {
                              setDeletingId(null);
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                        >
                          {deletingId === comment.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state comments-empty">
                  <p className="empty-state-title">No comments yet</p>
                  <p className="empty-state-hint">Select text in the document and click the + button to add a comment.</p>
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
                <span className="info-value">{authorName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Created</span>
                <span className="info-value">{formatDate(document.createdAt)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Modified</span>
                <span className="info-value">{formatDate(document.updatedAt)}</span>
              </div>
              <div className="info-divider"></div>
              <div className="info-item">
                <span className="info-label">Words</span>
                <span className="info-value">{wordCount.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Characters</span>
                <span className="info-value">{characterCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DocumentSidebar;


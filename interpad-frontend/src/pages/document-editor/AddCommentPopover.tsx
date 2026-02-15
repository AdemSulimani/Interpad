import { useState, useRef, useEffect } from 'react';
import './style/AddCommentPopover.css';
import { createDocumentComment } from '../../services';
import type { CommentSelectionAnchor } from './EditorArea';

interface AddCommentPopoverProps {
  documentId: string;
  /** Kur null, koment i përgjithshëm (pa teksti të selektuar) – hapi 5. */
  anchor: CommentSelectionAnchor | null;
  rect: { top: number; left: number; width: number; height: number };
  onClose: () => void;
  /** Hapi 7: thirret pas ruajtjes; commentId për të fokusuar komentin e ri në sidebar. */
  onSuccess: (commentId?: string) => void;
}

const AddCommentPopover = ({ documentId, anchor, rect, onClose, onSuccess }: AddCommentPopoverProps) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setError(null);
    setSubmitting(true);
    try {
      const comment = await createDocumentComment(documentId, {
        content: trimmed,
        anchor:
          anchor != null
            ? {
                pageIndex: anchor.pageIndex,
                startOffset: anchor.startOffset,
                endOffset: anchor.endOffset,
                selectedText: anchor.selectedText,
              }
            : undefined,
      });
      onSuccess(comment.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const top = anchor != null ? rect.top - 8 : rect.top;
  const left =
    anchor != null ? Math.max(12, rect.left + rect.width / 2 - 180) : Math.max(12, rect.left);

  return (
    <div
      className="add-comment-popover"
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1001,
      }}
      role="dialog"
      aria-label="Add comment"
    >
      <div className="add-comment-popover-inner">
        {anchor?.selectedText && (
          <div className="add-comment-quote" title="Selected text">
            "{anchor.selectedText.slice(0, 80)}{anchor.selectedText.length > 80 ? '…' : ''}"
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="add-comment-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            disabled={submitting}
            aria-label="Comment text"
          />
          {error && <p className="add-comment-error" role="alert">{error}</p>}
          <div className="add-comment-actions">
            <button
              type="button"
              className="add-comment-btn add-comment-btn-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="add-comment-btn add-comment-btn-submit"
              disabled={submitting || !content.trim()}
            >
              {submitting ? 'Saving…' : 'Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCommentPopover;

import { useRef, useEffect, useCallback, useState } from 'react';
import './style/EditorArea.css';
import { useDocumentEditor } from './context/DocumentEditorContext';
import { hasPageOverflow } from './utils/measurePageOverflow';
import { splitContentIntoPages } from './utils/splitPageContent';

/** Anchor për koment: faqja dhe offset-at e tekstit të selektuar (për hapin 3 – Add comment). */
export interface CommentSelectionAnchor {
  pageIndex: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
}

const DEFAULT_PLACEHOLDER_HTML = '<p>Start typing your document here...</p>';
const EMPTY_PAGE_HTML = '<p><br></p>';
const CONTENT_DEBOUNCE_MS = 400;
const COMMENT_HIGHLIGHT_ATTR = 'data-comment-highlight';

/** Heq span-at e highlight-it nga HTML para se ta ruajmë në state (hapi 6). */
function stripCommentHighlights(html: string): string {
  if (typeof window === 'undefined' || !html) return html;
  const div = window.document.createElement('div');
  div.innerHTML = html;
  const spans = div.querySelectorAll(`[${COMMENT_HIGHLIGHT_ATTR}]`);
  spans.forEach((span) => {
    const text = window.document.createTextNode(span.textContent ?? '');
    span.parentNode?.replaceChild(text, span);
  });
  return div.innerHTML;
}

/** Përmbajtja për një faqe bosh: vetëm për faqen e parë kur është e vetmja shfaqet placeholder-i. */
function getEmptyPageContent(pageIndex: number, totalPages: number): string {
  return pageIndex === 0 && totalPages === 1 ? DEFAULT_PLACEHOLDER_HTML : EMPTY_PAGE_HTML;
}

/** Kthen offset-in e karaktereve nga fillimi i container deri te pika (node, offset) */
function getCharacterOffset(container: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(container, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

/** Gjen (node, offset) që korrespondon me offset-in e dhënë të karaktereve (për ri-vendosjen e kursorit) */
function setCharacterOffset(container: Node, targetOffset: number): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let count = 0;
  let node: Node | null = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (count + len >= targetOffset) {
      return { node, offset: targetOffset - count };
    }
    count += len;
    node = walker.nextNode();
  }
  const last = getLastTextNodeOrContainer(container);
  return last ? { node: last.node, offset: last.offset } : null;
}

function getLastTextNodeOrContainer(container: Node): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let last: Node | null = null;
  let node: Node | null = walker.nextNode();
  while (node) {
    last = node;
    node = walker.nextNode();
  }
  if (last) return { node: last, offset: last.textContent?.length ?? 0 };
  return { node: container, offset: 0 };
}

/** Ruaj pozicionin e selection/cursor brenda elementit; kthe offset fillor dhe përfundimtar (karaktere). */
function saveSelection(editable: HTMLElement): { start: number; end: number } | null {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) return null;
  const start = getCharacterOffset(editable, range.startContainer, range.startOffset);
  const end = getCharacterOffset(editable, range.endContainer, range.endOffset);
  return { start, end };
}

/** Ri-vendos selection/cursor në offset-in e ruajtur dhe kthen fokusin te elementi. */
function restoreSelection(editable: HTMLElement, saved: { start: number; end: number }): void {
  const maxLen = (editable.textContent ?? '').length;
  const start = Math.min(saved.start, maxLen);
  const end = Math.min(saved.end, maxLen);
  const startPos = setCharacterOffset(editable, start);
  const endPos = setCharacterOffset(editable, end);
  if (!startPos || !endPos) return;
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  const sel = document.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
  editable.focus();
}

/** Vendos kursorin në fillim të përmbajtjes së elementit (p.sh. pas split për faqen e re). */
function setCursorToStart(editable: HTMLElement): void {
  const pos = setCharacterOffset(editable, 0);
  if (!pos) return;
  const range = document.createRange();
  range.setStart(pos.node, pos.offset);
  range.setEnd(pos.node, pos.offset);
  const sel = document.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
  editable.focus();
}

/** Kontrollon nëse container përmban node (vetë ose brenda). */
function containerContains(container: Node | null, node: Node): boolean {
  if (!container) return false;
  return container === node || container.contains(node);
}

interface CommentSelectionState {
  anchor: CommentSelectionAnchor;
  rect: { top: number; left: number; width: number; height: number };
}

interface EditorAreaProps {
  /** Kur përdoruesi klikon "Add comment" në bubble; anchor + rect për pozicionimin e popover-it. */
  onAddCommentClick?: (
    anchor: CommentSelectionAnchor,
    rect: { top: number; left: number; width: number; height: number }
  ) => void;
  /** Hapi 7: kur përdoruesi klikon teksti të theksuar (highlight), hap komentin në sidebar. */
  onCommentHighlightClick?: (commentId: string) => void;
}

const EditorArea = ({ onAddCommentClick, onCommentHighlightClick }: EditorAreaProps) => {
  const {
    document,
    setContent,
    setPages,
    setPageContent,
    editorRef,
    saveEditorSelection,
    setFocusedPageIndex,
    focusedPageIndex,
    registerScrollToCommentAnchor,
    comments,
    zoomLevel,
  } = useDocumentEditor();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pendingChangeRef = useRef<{ pageIndex: number; html: string } | null>(null);
  const focusPageAfterSplitRef = useRef<number | null>(null);
  const documentPagesRef = useRef<string[]>(document.pages);
  documentPagesRef.current = document.pages;

  const [commentSelection, setCommentSelection] = useState<CommentSelectionState | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const commentBubbleRef = useRef<HTMLDivElement | null>(null);

  // Sync nga state te DOM vetëm kur ndryshon dokumenti (id) – ngarkim doc i ri.
  // Faqe bosh: vetëm faqja 1 (e vetme) merr placeholder-in "Start typing..."; të tjerat marrin <p><br></p>.
  useEffect(() => {
    const pages = document.pages;
    for (let j = 0; j < pages.length; j++) {
      const el = pageRefs.current[j];
      if (!el) continue;
      const raw = pages[j]?.trim() || '';
      const contentFromState = raw || getEmptyPageContent(j, pages.length);
      if (contentFromState === el.innerHTML) continue;
      const saved = saveSelection(el);
      el.innerHTML = contentFromState;
      if (saved !== null) restoreSelection(el, saved);
    }
  }, [document.id]);

  // Pas split, fokuson faqen e re (pageIndex + 1) dhe vendos kursorin në fillim (Hapi 8 opsional).
  useEffect(() => {
    const focusIndex = focusPageAfterSplitRef.current;
    if (focusIndex == null) return;
    focusPageAfterSplitRef.current = null;
    const nextEl = pageRefs.current[focusIndex];
    if (nextEl) {
      nextEl.focus();
      setCursorToStart(nextEl);
      setFocusedPageIndex(focusIndex);
    }
  }, [document.pages.length, setFocusedPageIndex]);

  // Mbaj editorRef në sync me faqen e fokusuar (kur ndryshon focusedPageIndex ose numri i faqeve).
  // Invariant: editorRef.current duhet të tregojë gjithmonë elementin e faqes së fokusuar,
  // që toolbar-i dhe syncEditorContentToState të punojnë mbi faqen e duhur (jo gjithmonë faqen 1).
  useEffect(() => {
    const el = pageRefs.current[focusedPageIndex];
    if (el && editorRef) editorRef.current = el;
  }, [focusedPageIndex, document.pages.length, editorRef]);

  // Verifikim vetëm në dev: editorRef duhet të përputhet me faqen e fokusuar kur ka shumë faqe.
  useEffect(() => {
    if (import.meta.env.DEV && document.pages.length > 1) {
      const expected = pageRefs.current[focusedPageIndex];
      if (expected && editorRef?.current !== expected) {
        console.warn(
          '[EditorArea] editorRef nuk përputhet me faqen e fokusuar: focusedPageIndex=',
          focusedPageIndex,
          '– toolbar-i mund të shkruajë në faqen e gabuar.'
        );
      }
    }
  }, [focusedPageIndex, document.pages.length, editorRef]);

  // Hapi 2: ndiq selection-in për "Add comment" – nëse ka tekst të zgjedhur brenda një faqe, shfaq bubble.
  useEffect(() => {
    const doc = window.document;
    const handleSelectionChange = () => {
      const sel = doc.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setCommentSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (range.collapsed) {
        setCommentSelection(null);
        return;
      }

      const pages = pageRefs.current;
      let pageIndex = -1;
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        if (!pageEl) continue;
        const startIn = containerContains(pageEl, range.startContainer);
        const endIn = containerContains(pageEl, range.endContainer);
        if (startIn && endIn) {
          pageIndex = i;
          break;
        }
      }
      if (pageIndex < 0) {
        setCommentSelection(null);
        return;
      }

      const container = pages[pageIndex]!;
      const startOffset = getCharacterOffset(container, range.startContainer, range.startOffset);
      const endOffset = getCharacterOffset(container, range.endContainer, range.endOffset);
      const selectedText = range.toString().trim();
      if (selectedText.length === 0) {
        setCommentSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      setCommentSelection({
        anchor: { pageIndex, startOffset, endOffset, selectedText },
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      });
    };

    doc.addEventListener('selectionchange', handleSelectionChange);
    return () => doc.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Fsheh bubble kur klikohet jashtë editorit; kur klikohet brenda, fsheh nëse nuk ka seleksion të vërtetë.
  useEffect(() => {
    const doc = window.document;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideEditor = editorWrapperRef.current?.contains(target);
      const insideBubble = commentBubbleRef.current?.contains(target);
      if (insideBubble) return;

      if (!insideEditor) {
        setCommentSelection(null);
        return;
      }
      // Klik brenda editorit: nëse nuk ka tekst të zgjedhur, fsheh bubble (selectionchange mund të vonojë).
      const sel = doc.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setCommentSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (range.collapsed || range.toString().trim().length === 0) {
        setCommentSelection(null);
      }
    };
    doc.addEventListener('mousedown', handleMouseDown);
    return () => doc.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Hapi 6: vendos highlight (background) mbi tekstin e komentuar.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const doc = window.document;
      const pages = pageRefs.current;
    const withAnchor = comments.filter(
      (c) =>
        c.anchor != null &&
        typeof c.anchor.pageIndex === 'number' &&
        typeof c.anchor.startOffset === 'number' &&
        typeof c.anchor.endOffset === 'number'
    );
    if (withAnchor.length === 0) return;

    // Heq highlight-at e vjetra nga çdo faqe.
    pages.forEach((container) => {
      if (!container) return;
      const spans = container.querySelectorAll(`[${COMMENT_HIGHLIGHT_ATTR}]`);
      spans.forEach((span) => {
        const text = doc.createTextNode(span.textContent ?? '');
        span.parentNode?.replaceChild(text, span);
      });
    });

    // Aplikon nga fundi që offset-at e herët të mos ndërrohen.
    const sorted = [...withAnchor].sort(
      (a, b) => (b.anchor!.pageIndex! - a.anchor!.pageIndex!) || (b.anchor!.startOffset! - a.anchor!.startOffset!)
    );
    sorted.forEach((comment) => {
      const a = comment.anchor!;
      const pageIndex = a.pageIndex!;
      const container = pages[pageIndex];
      if (!container) return;
      const maxLen = (container.textContent ?? '').length;
      const start = Math.min(a.startOffset!, maxLen);
      const end = Math.min(Math.max(a.endOffset!, start), maxLen);
      const startPos = setCharacterOffset(container, start);
      const endPos = setCharacterOffset(container, end);
      if (!startPos || !endPos) return;
      const range = doc.createRange();
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
      try {
        const span = doc.createElement('span');
        span.setAttribute(COMMENT_HIGHLIGHT_ATTR, comment.id);
        span.className = 'editor-comment-highlight';
        range.surroundContents(span);
      } catch {
        // surroundContents hedh nëse range ndan nyje; anashkalojmë këtë koment.
      }
    });
    });
    return () => cancelAnimationFrame(id);
  }, [comments, document.pages.length]);

  // Hapi 4: regjistron scroll te teksti i komentuar (kur klikohet komenti në sidebar).
  useEffect(() => {
    registerScrollToCommentAnchor((anchor) => {
      const container = pageRefs.current[anchor.pageIndex];
      if (!container) return;
      const maxLen = (container.textContent ?? '').length;
      const start = Math.min(anchor.startOffset, maxLen);
      const end = Math.min(Math.max(anchor.endOffset, start), maxLen);
      restoreSelection(container, { start, end });
      setFocusedPageIndex(anchor.pageIndex);
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => registerScrollToCommentAnchor(null);
  }, [registerScrollToCommentAnchor, setFocusedPageIndex]);

  const onCommentBubbleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!commentSelection) return;
      onAddCommentClick?.(commentSelection.anchor, commentSelection.rect);
      setCommentSelection(null);
    },
    [commentSelection, onAddCommentClick]
  );

  const flushPendingChange = useCallback(() => {
    const pending = pendingChangeRef.current;
    if (pending == null) return;
    pendingChangeRef.current = null;
    const { pageIndex } = pending;
    const el = pageRefs.current[pageIndex];
    if (!el) return;
    // Përdor përmbajtjen aktuale të DOM (toolbar mund ta ketë ndryshuar pas onInput); heq highlight-at para ruajtjes (hapi 6).
    const html = stripCommentHighlights(el.innerHTML);
    const width = el.offsetWidth;
    const pages = documentPagesRef.current;

    if (width <= 0) {
      if (pageIndex === 0) setContent(html);
      else setPageContent(pageIndex, html);
      return;
    }

    if (hasPageOverflow(html, width)) {
      const newPages = splitContentIntoPages(html, width);
      const nextPages =
        pageIndex === 0
          ? [...newPages, ...pages.slice(1)]
          : [
              ...pages.slice(0, pageIndex),
              ...newPages,
              ...pages.slice(pageIndex + 1),
            ];
      if (newPages.length > 1) focusPageAfterSplitRef.current = pageIndex + 1;
      setPages(nextPages);
      el.innerHTML = newPages[0]?.trim() || EMPTY_PAGE_HTML;
      // Sync editorRef menjëherë pas split: faqja e ndryshuar (pageIndex) mbetet e vlefshme deri sa re-render + useEffect të vendosin ref për faqen e fokusuar.
      if (editorRef) editorRef.current = el;
    } else {
      if (pageIndex === 0) setContent(html);
      else setPageContent(pageIndex, html);
    }
  }, [setContent, setPageContent, setPages, editorRef]);

  const scheduleFlush = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      flushPendingChange();
    }, CONTENT_DEBOUNCE_MS);
  }, [flushPendingChange]);

  const onPageContentChange = useCallback(
    (pageIndex: number) => (e: React.FormEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      pendingChangeRef.current = { pageIndex, html: el.innerHTML };
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const onPageFocus = useCallback(
    (pageIndex: number) => (e: React.FocusEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el && editorRef) editorRef.current = el;
      setFocusedPageIndex(pageIndex);
    },
    [editorRef, setFocusedPageIndex]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onEditorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const highlight = target.closest?.(`[${COMMENT_HIGHLIGHT_ATTR}]`);
      if (highlight instanceof HTMLElement) {
        const commentId = highlight.getAttribute(COMMENT_HIGHLIGHT_ATTR);
        if (commentId) onCommentHighlightClick?.(commentId);
        return;
      }
      const anchor = target.closest?.('a');
      if (anchor && anchor.href) {
        e.preventDefault();
        e.stopPropagation();
        window.open(anchor.href, '_blank', 'noopener,noreferrer');
      }
    },
    [onCommentHighlightClick]
  );

  const pages = document.pages.length ? document.pages : [DEFAULT_PLACEHOLDER_HTML];

  return (
    <div className="editor-area-wrapper" ref={editorWrapperRef}>
      {/* Bubble "Add comment" mbi selection – hapi 2 */}
      {commentSelection && (
        <div
          ref={commentBubbleRef}
          className="editor-comment-bubble"
          style={{
            position: 'fixed',
            top: commentSelection.rect.top - 44,
            left: commentSelection.rect.left + commentSelection.rect.width / 2 - 20,
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            className="editor-comment-bubble-btn"
            onClick={onCommentBubbleClick}
            onMouseDown={(e) => e.preventDefault()}
            title="Add comment"
            aria-label="Add comment"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}
      <div
        className="editor-area-container"
        style={{
          zoom: zoomLevel / 100,
          WebkitZoom: zoomLevel / 100,
        } as React.CSSProperties}
      >
        {pages.map((_, pageIndex) => (
          <div key={pageIndex} className="editor-page">
            <div
              ref={(node) => {
                pageRefs.current[pageIndex] = node;
                // Kur elementi hiqet (node === null), pastro editorRef nëse ishte faqja e fokusuar – shmang ref të vjetër (stale).
                if (!node && pageIndex === focusedPageIndex && editorRef) editorRef.current = null;
                // Vetëm faqja e fokusuar e vendos editorRef (jo gjithmonë faqja 0), që toolbar të aplikohet në faqen e duhur.
                if (node && pageIndex === focusedPageIndex && editorRef) editorRef.current = node;
                if (node && pageIndex > 0) {
                  const content = document.pages[pageIndex];
                  if (content != null && content !== node.innerHTML) node.innerHTML = content;
                }
              }}
              className="editor-area"
              contentEditable={true}
              suppressContentEditableWarning={true}
              role="textbox"
              aria-label={`Page ${pageIndex + 1}`}
              spellCheck={true}
              onInput={onPageContentChange(pageIndex)}
              onPaste={onPageContentChange(pageIndex)}
              onFocus={onPageFocus(pageIndex)}
              onBlur={saveEditorSelection}
              onClick={onEditorClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditorArea;

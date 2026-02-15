import { useRef, useEffect, useCallback } from 'react';
import './style/EditorArea.css';
import { useDocumentEditor } from './context/DocumentEditorContext';
import { hasPageOverflow } from './utils/measurePageOverflow';
import { splitContentIntoPages } from './utils/splitPageContent';

const DEFAULT_PLACEHOLDER_HTML = '<p>Start typing your document here...</p>';
const EMPTY_PAGE_HTML = '<p><br></p>';
const CONTENT_DEBOUNCE_MS = 400;

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

const EditorArea = () => {
  const {
    document,
    setContent,
    setPages,
    setPageContent,
    editorRef,
    saveEditorSelection,
    setFocusedPageIndex,
    focusedPageIndex,
  } = useDocumentEditor();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pendingChangeRef = useRef<{ pageIndex: number; html: string } | null>(null);
  const focusPageAfterSplitRef = useRef<number | null>(null);
  const documentPagesRef = useRef<string[]>(document.pages);
  documentPagesRef.current = document.pages;

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

  const flushPendingChange = useCallback(() => {
    const pending = pendingChangeRef.current;
    if (pending == null) return;
    pendingChangeRef.current = null;
    const { pageIndex } = pending;
    const el = pageRefs.current[pageIndex];
    if (!el) return;
    // Përdor përmbajtjen aktuale të DOM (toolbar mund ta ketë ndryshuar pas onInput); mos mbishkruaj me pending të vjetër.
    const html = el.innerHTML;
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

  const onEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest?.('a');
    if (anchor && anchor.href) {
      e.preventDefault();
      e.stopPropagation();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const pages = document.pages.length ? document.pages : [DEFAULT_PLACEHOLDER_HTML];

  return (
    <div className="editor-area-wrapper">
      <div className="editor-area-container">
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

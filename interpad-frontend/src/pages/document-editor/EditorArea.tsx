import { useRef, useEffect, useCallback } from 'react';
import './style/EditorArea.css';
import { useDocumentEditor } from './context/DocumentEditorContext';

const DEFAULT_PLACEHOLDER_HTML = '<p>Start typing your document here...</p>';
const CONTENT_DEBOUNCE_MS = 400;

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
  // Kursor në fund: vendos në nyjen e fundit të tekstit ose në container
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

const EditorArea = () => {
  const { document, setContent, editorRef, saveEditorSelection } = useDocumentEditor();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync “nga jashtë” vetëm kur ndryshon dokumenti (id), jo kur ndryshon document.content nga onInput.
  // Nëse varem nga document.content, pas çdo debounce setContent() do të bënte innerHTML = content
  // dhe do të shkatërronte undo/redo stack-in e shfletuesit.
  useEffect(() => {
    const el = editorRef?.current ?? null;
    if (!el) return;
    const contentFromState = document.content?.trim() || DEFAULT_PLACEHOLDER_HTML;
    if (contentFromState === el.innerHTML) return;

    const saved = saveSelection(el);
    el.innerHTML = contentFromState;
    if (saved !== null) {
      restoreSelection(el, saved);
    }
  }, [document.id]); // vetëm document.id – kur ngarkohet doc i ri; document.content lexohet brenda por nuk është në deps

  // Debounce: thirr setContent vetëm pas X ms pa ndryshime, për më pak re-render dhe performancë më të mirë.
  // Çdo ndryshim në editor (shkrim, fshirje, paste) përfundimisht përditëson document.content në context,
  // që StatusBar ta përdorë për word/character count (Hapi 7).
  const onContentChange = useCallback(
    (_e: React.FormEvent<HTMLDivElement>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const el = editorRef?.current;
        if (!el) return;
        const html = el.innerHTML;
        setContent(html); // përditëson state dhe hasUnsavedChanges = true
      }, CONTENT_DEBOUNCE_MS);
    },
    [setContent, editorRef]
  );

  // Pastro timeout në unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /** Kur klikohet teksti që është link, hap URL-në në tab të ri (në contentEditable klikimi zakonisht vetëm e zgjedh linkun). */
  const onEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest?.('a');
    if (anchor && anchor.href) {
      e.preventDefault();
      e.stopPropagation();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return (
    <div className="editor-area-wrapper">
      <div className="editor-area-container">
        <div
          ref={editorRef}
          className="editor-area"
          contentEditable={true}
          suppressContentEditableWarning={true}
          role="textbox"
          aria-label="Document editor"
          spellCheck={true}
          onInput={onContentChange}
          onPaste={onContentChange}
          onBlur={saveEditorSelection}
          onClick={onEditorClick}
        />
      </div>
    </div>
  );
};

export default EditorArea;


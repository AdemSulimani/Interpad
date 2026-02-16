const DEFAULT_PAGE_HTML = '<p>Start typing your document here...</p>';

/**
 * Heq artefaktet e padëshiruara nga HTML i editorit (p.sh. path-i i imazhit
 * i futur si tekst i thjeshtë nga layer-i realtime).
 *
 * Rasti konkret:
 *  - Disa klientë mund të shohin diçka si:
 *      src="http://localhost:5000/uploads/images/xxx.png">
 *    si tekst në dokument, përveç vetë imazhit.
 *
 * Kjo funksion heq vetëm text nodes që duken si `src="<url>.png">` ose të ngjashme,
 * pa prekur atributet `src` brenda vetë tag-ut `<img>`.
 */
export function sanitizeEditorHtml(html: string): string {
  if (!html) return html;
  if (typeof window === 'undefined' || !window.document) return html;

  const doc = window.document;
  const container = doc.createElement('div');
  container.innerHTML = html;

  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const toRemove: Node[] = [];
  const pattern =
    /src="https?:\/\/[^"]+\.(?:png|jpe?g|gif|webp|svg)(\?[^"]*)?"\s*>?$/i;

  let node: Node | null = walker.nextNode();
  while (node) {
    const text = node.textContent?.trim();
    if (text && pattern.test(text)) {
      toRemove.push(node);
    }
    node = walker.nextNode();
  }

  toRemove.forEach((n) => {
    n.parentNode?.removeChild(n);
  });

  return container.innerHTML;
}

/**
 * Modeli i dokumentit në editor.
 * id: null = dokument i ri (ende pa u ruajtur); string = dokument ekzistues nga API.
 * pages: lista e faqesh – çdo element është HTML i asaj faqeje (për pagination / overflow).
 */
export interface DocumentModel {
  /** ID nga API; null për dokument të ri */
  id: string | null;
  /** Titulli i dokumentit */
  title: string;
  /** Lista e faqesh – çdo faqe është HTML nga contentEditable */
  pages: string[];
  /** (Opsional) Koha e krijimit – për save/API */
  createdAt?: string;
  /** (Opsional) Koha e fundit e ndryshimit */
  updatedAt?: string;
  /** (Opsional) Version për optimistic locking / API */
  version?: number;
}

/** Delimiter midis faqeve në content të ruajtur – për të rikthyer faqet kur ngarkojmë. */
export const PAGE_DELIMITER = '<!-- INTERPAD-PAGE -->';

/** Kthen përmbajtjen e plotë të dokumentit (të gjitha faqet bashkë) – për API, word count, etj. */
export function getDocumentContent(doc: DocumentModel): string {
  return doc.pages.join(PAGE_DELIMITER);
}

/** Alias më i qartë për layer‑in realtime: pages[] -> fullText string. */
export function serializePagesToText(pages: string[]): string {
  return (pages ?? []).join(PAGE_DELIMITER);
}

/** Ndan content të ruajtur në faqe; dokumente pa delimiter mbeten një faqe (backward compatibility). */
export function contentToPages(content: string | null | undefined): string[] {
  const raw = (content ?? '').trim() || DEFAULT_PAGE_HTML;
  const sanitized = sanitizeEditorHtml(raw);
  if (!sanitized.includes(PAGE_DELIMITER)) return [sanitized];
  return sanitized
    .split(PAGE_DELIMITER)
    .map((p) => sanitizeEditorHtml(p.trim() || DEFAULT_PAGE_HTML));
}

/** Alias i kundërt për layer‑in realtime: fullText string -> pages[]. */
export function splitTextToPages(text: string): string[] {
  return contentToPages(text);
}

/** Konverton dokument nga API (me content) në DocumentModel (me pages). Backward compatibility. */
export function documentFromApiContent(apiDoc: { content?: string | null }): { pages: string[] } {
  return { pages: contentToPages(apiDoc.content) };
}

/** Vlera fillestare për dokument të ri */
export const createEmptyDocument = (): DocumentModel => ({
  id: null,
  title: '',
  pages: [DEFAULT_PAGE_HTML],
});

/** Dokument default për inicializim (p.sh. "Untitled Document") */
export const getDefaultDocument = (): DocumentModel => ({
  ...createEmptyDocument(),
  title: 'Untitled Document',
  pages: [DEFAULT_PAGE_HTML],
});

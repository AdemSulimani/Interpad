const DEFAULT_PAGE_HTML = '<p>Start typing your document here...</p>';

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

/** Kthen përmbajtjen e plotë të dokumentit (të gjitha faqet bashkë) – për API, word count, etj. */
export function getDocumentContent(doc: DocumentModel): string {
  return doc.pages.join('');
}

/** Konverton dokument nga API (me content) në DocumentModel (me pages). Backward compatibility. */
export function documentFromApiContent(apiDoc: { content?: string | null }): { pages: string[] } {
  const content = apiDoc.content?.trim() || DEFAULT_PAGE_HTML;
  return { pages: [content] };
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

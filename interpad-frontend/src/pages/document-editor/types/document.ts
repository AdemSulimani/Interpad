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

/** Delimiter midis faqeve në content të ruajtur – për të rikthyer faqet kur ngarkojmë. */
export const PAGE_DELIMITER = '<!-- INTERPAD-PAGE -->';

/** Kthen përmbajtjen e plotë të dokumentit (të gjitha faqet bashkë) – për API, word count, etj. */
export function getDocumentContent(doc: DocumentModel): string {
  return doc.pages.join(PAGE_DELIMITER);
}

/** Ndan content të ruajtur në faqe; dokumente pa delimiter mbeten një faqe (backward compatibility). */
export function contentToPages(content: string | null | undefined): string[] {
  const raw = (content ?? '').trim() || DEFAULT_PAGE_HTML;
  if (!raw.includes(PAGE_DELIMITER)) return [raw];
  return raw.split(PAGE_DELIMITER).map((p) => p.trim() || DEFAULT_PAGE_HTML);
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

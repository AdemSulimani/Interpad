/**
 * Modeli i dokumentit në editor.
 * id: null = dokument i ri (ende pa u ruajtur); string = dokument ekzistues nga API.
 * content: HTML nga contentEditable, i përshtatshëm për save/load.
 */
export interface DocumentModel {
  /** ID nga API; null për dokument të ri */
  id: string | null;
  /** Titulli i dokumentit */
  title: string;
  /** Përmbajtja (zakonisht HTML) nga contentEditable */
  content: string;
  /** (Opsional) Koha e krijimit – për save/API */
  createdAt?: string;
  /** (Opsional) Koha e fundit e ndryshimit */
  updatedAt?: string;
  /** (Opsional) Version për optimistic locking / API */
  version?: number;
}

/** Vlera fillestare për dokument të ri */
export const createEmptyDocument = (): DocumentModel => ({
  id: null,
  title: '',
  content: '<p>Start typing your document here...</p>',
});

/** Dokument default për inicializim (p.sh. "Untitled Document") */
export const getDefaultDocument = (): DocumentModel => ({
  ...createEmptyDocument(),
  title: 'Untitled Document',
  content: '<p>Start typing your document here...</p>',
});

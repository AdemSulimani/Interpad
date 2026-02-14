/**
 * Hapi 3: Matja e overflow-it të faqes.
 * Përcakton nëse përmbajtja (HTML) e një faqeje e kalon lartësinë e lejuar të një faqeje.
 * Përdoret për të vendosur kur të krijohet faqja e re (Hapi 4–6).
 */

export const MEASURE_CLASS = 'editor-area';
export const MEASURE_WRAPPER_ID = 'document-editor-measure-wrapper';

/** Prag në px: konsiderohet overflow vetëm kur përmbajtja e kalon lartësinë e faqes me më shumë se kjo. Shmang krijimin e faqeve të tepërta për pak "tepertë". */
export const OVERFLOW_THRESHOLD_PX = 10;

/**
 * Kthen lartësinë e një faqeje në piksel (nga --document-page-height).
 * Përdor një element të përkohshëm që të konvertojë çdo njësi CSS (px, vh, etj.) në px.
 */
export function getDocumentPageHeightPx(): number {
  if (typeof document === 'undefined') return 1100;
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue('--document-page-height').trim();
  if (!raw) return 1100;
  const parsed = parseInt(raw, 10);
  if (Number.isFinite(parsed)) return parsed;
  const probe = document.createElement('div');
  probe.style.setProperty('position', 'absolute');
  probe.style.setProperty('left', '-9999px');
  probe.style.setProperty('height', `var(--document-page-height)`);
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);
  return Number.isFinite(px) ? Math.round(px) : 1100;
}

/**
 * Mat lartësinë që zë përmbajtja (HTML) kur renderohet me të njëjtat stil si faqja.
 * Përdor një div të fshehur me klasën .editor-area dhe gjerësinë e container-it.
 */
export function measurePageContentHeight(html: string, containerWidthPx: number): number {
  if (typeof document === 'undefined') return 0;
  let wrapper = document.getElementById(MEASURE_WRAPPER_ID) as HTMLDivElement | null;
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = MEASURE_WRAPPER_ID;
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.cssText =
      'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;';
    document.body.appendChild(wrapper);
  }
  wrapper.style.width = `${containerWidthPx}px`;
  wrapper.style.boxSizing = 'border-box';
  const inner = document.createElement('div');
  inner.className = MEASURE_CLASS;
  inner.style.width = `${containerWidthPx}px`;
  inner.style.boxSizing = 'border-box';
  inner.innerHTML = html || '';
  wrapper.innerHTML = '';
  wrapper.appendChild(inner);
  const height = inner.scrollHeight;
  wrapper.innerHTML = '';
  return height;
}

export interface PageOverflowResult {
  /** Lartësia e përmbajtjes (scrollHeight) në px */
  contentHeightPx: number;
  /** Lartësia e lejuar e faqes në px */
  pageHeightPx: number;
  /** true nëse përmbajtja e kalon lartësinë e faqes */
  hasOverflow: boolean;
}

/**
 * Kontrollon nëse HTML-ja e dhënë e kalon lartësinë e një faqeje.
 * Duhet të kalohet gjerësia e container-it (p.sh. editorRef.current.offsetWidth) që matja të përputhet me editorin.
 */
export function getPageOverflow(
  html: string,
  containerWidthPx: number
): PageOverflowResult {
  const pageHeightPx = getDocumentPageHeightPx();
  const contentHeightPx = measurePageContentHeight(html, containerWidthPx);
  const overflowLimit = pageHeightPx + OVERFLOW_THRESHOLD_PX;
  return {
    contentHeightPx,
    pageHeightPx,
    hasOverflow: contentHeightPx > overflowLimit,
  };
}

/**
 * Shkurtesë: a ka overflow? (përmbajtja e kalon lartësinë e faqes)
 */
export function hasPageOverflow(html: string, containerWidthPx: number): boolean {
  return getPageOverflow(html, containerWidthPx).hasOverflow;
}

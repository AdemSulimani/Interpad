/**
 * Hapi 4: Ndarja e përmbajtjes në dy pjesë kur faqja është e mbushur (overflow).
 * Ndarja bëhet në kufirin e elementeve; nëse një element i vetëm e kalon faqen, ndahet brenda elementit (tekst).
 */

import {
  getDocumentPageHeightPx,
  hasPageOverflow,
  measurePageContentHeight,
  MEASURE_CLASS,
  MEASURE_WRAPPER_ID,
} from './measurePageOverflow';

export interface SplitPageContentResult {
  /** HTML për faqen 1 (përmbajtja që mbetet brenda lartësisë së faqes) */
  htmlPage1: string;
  /** HTML për faqen 2 (pjesa që del jashtë; mund të jetë e zbrazët) */
  htmlPage2: string;
  /** A u bë ndarja (true nëse ka përmbajtje në faqen 2) */
  wasSplit: boolean;
}

const EMPTY_PAGE_HTML = '<p><br></p>';

/** Tolerance në px: elementi konsiderohet "brenda faqes" nëse fundi i tij është brenda kësaj vlerë nga kufiri. Shmang ndarje të herët dhe krijimin e faqeve të tepërta. */
const OVERFLOW_TOLERANCE_PX = 5;

/** Lartësia minimale (px) e përmbajtjes që duhet të ketë "faqja e re" (overflow) që të krijohet. Nën këtë, përmbajtja mbetet në faqen e mëparshme (Hapi 4). */
const MIN_PAGE_CONTENT_HEIGHT_PX = 60;

function getMeasureWrapper(): HTMLDivElement {
  let wrapper = document.getElementById(MEASURE_WRAPPER_ID);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = MEASURE_WRAPPER_ID;
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.cssText =
      'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;';
    document.body.appendChild(wrapper);
  }
  return wrapper as HTMLDivElement;
}

/**
 * Gjen offset-in në një text node ku range.getBoundingClientRect().bottom kalon pageBottom.
 * Kthen offset-in më të madh ku bottom <= pageBottom (përmbajtja deri aty mbetet në faqen 1).
 */
function findTextSplitOffset(
  textNode: Text,
  pageBottom: number,
  range: Range
): number {
  const len = textNode.length;
  if (len === 0) return 0;
  range.setStart(textNode, 0);
  range.setEnd(textNode, 0);
  let lastFit = 0;
  for (let offset = 1; offset <= len; offset++) {
    range.setEnd(textNode, offset);
    const rect = range.getBoundingClientRect();
    if (rect.bottom <= pageBottom) lastFit = offset;
  }
  return lastFit;
}

/** Kthen të gjitha text node-at e një elementi në rend dokument. */
function getTextNodesInOrder(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n: Node | null = walker.nextNode();
  while (n) {
    out.push(n as Text);
    n = walker.nextNode();
  }
  return out;
}

/**
 * Ndah një element të vetëm që e kalon lartësinë e faqes: pjesa që futet (page 1) dhe pjesa që mbetet (page 2).
 * Përdor klone të plota (cloneNode(true)) dhe ndërron vetëm përmbajtjen e text node-ave, që të ruhen stilet (span, ngjyrë, etj.).
 */
function splitSingleOverflowingElement(
  element: Element,
  innerTop: number,
  pageHeightPx: number
): { htmlPage1: string; htmlPage2: string } {
  const pageBottom = innerTop + pageHeightPx;
  const splitThreshold = pageBottom + OVERFLOW_TOLERANCE_PX;
  const range = document.createRange();
  const textNodes: Text[] = getTextNodesInOrder(element);
  if (textNodes.length === 0) {
    const tag = element.tagName.toLowerCase();
    return { htmlPage1: `<${tag}><br></${tag}>`, htmlPage2: element.outerHTML };
  }
  let splitNodeIndex = -1;
  let splitOffset = 0;
  for (let i = 0; i < textNodes.length; i++) {
    const offset = findTextSplitOffset(textNodes[i], splitThreshold, range);
    if (offset < textNodes[i].length) {
      splitNodeIndex = i;
      splitOffset = offset;
      break;
    }
  }
  if (splitNodeIndex < 0) {
    return { htmlPage1: element.outerHTML, htmlPage2: EMPTY_PAGE_HTML };
  }
  const clone1 = element.cloneNode(true) as HTMLElement;
  const clone2 = element.cloneNode(true) as HTMLElement;
  const textNodes1 = getTextNodesInOrder(clone1);
  const textNodes2 = getTextNodesInOrder(clone2);
  for (let i = 0; i < textNodes.length; i++) {
    const text = textNodes[i].textContent ?? '';
    if (i < splitNodeIndex) {
      textNodes1[i].data = text;
      textNodes2[i].data = '';
    } else if (i > splitNodeIndex) {
      textNodes1[i].data = '';
      textNodes2[i].data = text;
    } else {
      textNodes1[i].data = text.slice(0, splitOffset);
      textNodes2[i].data = text.slice(splitOffset);
    }
  }
  const htmlPage1 = clone1.textContent?.trim() ? clone1.outerHTML : EMPTY_PAGE_HTML;
  const htmlPage2 = clone2.textContent?.trim() ? clone2.outerHTML : EMPTY_PAGE_HTML;
  return { htmlPage1, htmlPage2 };
}

/**
 * Ndah përmbajtjen (HTML) në dy faqe: pjesa që futet në lartësinë e faqes (page 1)
 * dhe pjesa që del jashtë (page 2). Përdoret koordinatë relative (innerTop) për krahasim të qëndrueshëm.
 */
export function splitPageContent(
  html: string,
  containerWidthPx: number
): SplitPageContentResult {
  if (typeof document === 'undefined') {
    return { htmlPage1: html, htmlPage2: '', wasSplit: false };
  }

  const pageHeightPx = getDocumentPageHeightPx();
  const wrapper = getMeasureWrapper();
  wrapper.style.width = `${containerWidthPx}px`;
  wrapper.style.boxSizing = 'border-box';

  const inner = document.createElement('div');
  inner.className = MEASURE_CLASS;
  inner.style.width = `${containerWidthPx}px`;
  inner.style.boxSizing = 'border-box';
  inner.innerHTML = html || EMPTY_PAGE_HTML;

  wrapper.innerHTML = '';
  wrapper.appendChild(inner);

  const innerRect = inner.getBoundingClientRect();
  const innerTop = innerRect.top;
  const pageBottom = innerTop + pageHeightPx;
  const overflowThreshold = pageBottom + OVERFLOW_TOLERANCE_PX;
  const children = Array.from(inner.children);

  let overflowIndex = -1;
  if (children.length > 0) {
    overflowIndex = children.findIndex((el) => {
      const bottom = (el as HTMLElement).getBoundingClientRect().bottom;
      return bottom > overflowThreshold;
    });
  }

  let htmlPage1: string;
  let htmlPage2: string;

  if (overflowIndex === -1) {
    htmlPage1 = html;
    htmlPage2 = '';
  } else if (overflowIndex === 0 && children.length === 1) {
    const single = children[0] as Element;
    const split = splitSingleOverflowingElement(single, innerTop, pageHeightPx);
    htmlPage1 = split.htmlPage1;
    htmlPage2 = split.htmlPage2;
  } else if (overflowIndex === 0) {
    htmlPage1 = EMPTY_PAGE_HTML;
    const part2 = document.createElement('div');
    children.forEach((child) => part2.appendChild(child.cloneNode(true)));
    htmlPage2 = part2.innerHTML;
  } else {
    const part1 = document.createElement('div');
    for (let i = 0; i < overflowIndex; i++) {
      part1.appendChild(children[i].cloneNode(true));
    }
    const part2 = document.createElement('div');
    for (let i = overflowIndex; i < children.length; i++) {
      part2.appendChild(children[i].cloneNode(true));
    }
    htmlPage1 = part1.innerHTML;
    htmlPage2 = part2.innerHTML;
  }

  wrapper.innerHTML = '';

  return {
    htmlPage1,
    htmlPage2,
    wasSplit: overflowIndex >= 0,
  };
}

/**
 * Hapi 2 ndreqje: ndah përmbajtjen në aq faqe sa duhen – përsërit split derisa asnjë faqe të mos e kalojë lartësinë.
 * Kthen listën e HTML-ve për çdo faqe (çdo element i listës futet në një faqe).
 * Hapi 5: Loop ndalon kur hasPageOverflow(current, containerWidthPx) është false (përfshirë OVERFLOW_THRESHOLD_PX);
 * përdoret i njëjti containerWidthPx kudo që matja të përputhet me editorin.
 */
export function splitContentIntoPages(
  html: string,
  containerWidthPx: number
): string[] {
  if (typeof document === 'undefined' || containerWidthPx <= 0) {
    return [html || EMPTY_PAGE_HTML];
  }
  const pages: string[] = [];
  let current = html?.trim() || EMPTY_PAGE_HTML;
  const maxIterations = 100;
  let iterations = 0;
  while (iterations < maxIterations && hasPageOverflow(current, containerWidthPx)) {
    const { htmlPage1, htmlPage2 } = splitPageContent(current, containerWidthPx);
    const overflowContent = htmlPage2?.trim() || '';
    if (overflowContent && measurePageContentHeight(overflowContent, containerWidthPx) < MIN_PAGE_CONTENT_HEIGHT_PX) {
      break;
    }
    const toPush = htmlPage1.trim() ? htmlPage1 : EMPTY_PAGE_HTML;
    pages.push(toPush);
    current = overflowContent;
    if (!current) break;
    iterations++;
  }
  if (current) pages.push(current);
  return pages.length > 0 ? pages : [EMPTY_PAGE_HTML];
}

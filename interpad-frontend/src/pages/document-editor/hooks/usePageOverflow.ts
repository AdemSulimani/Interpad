import { useMemo } from 'react';
import { getPageOverflow, type PageOverflowResult } from '../utils/measurePageOverflow';

/**
 * Hapi 3: Hook që llogarit nëse përmbajtja e faqes e kalon lartësinë e faqes (overflow).
 * Përdoret pas onInput/onPaste për të vendosur kur të ndahet përmbajtja në faqen tjetër (Hapi 4–5).
 */
export function usePageOverflow(
  pageHtml: string,
  containerWidthPx: number | null
): PageOverflowResult | null {
  return useMemo(() => {
    if (containerWidthPx == null || containerWidthPx <= 0) return null;
    return getPageOverflow(pageHtml, containerWidthPx);
  }, [pageHtml, containerWidthPx]);
}

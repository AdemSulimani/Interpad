import { useMemo } from 'react';
import { getPlainTextFromContent } from '../utils/getPlainTextFromContent';
import { getTextCounts, type TextCounts } from '../utils/getTextCounts';

/**
 * Llogarit word count, character count dhe character count without spaces
 * nga document.content (HTML). Përdoret në StatusBar.
 *
 * Numrat përditësohen çdo herë që ndryshon content: kur komponenti ri-renderon
 * me document nga context (pas setContent nga EditorArea / FormattingToolbar),
 * hook-u rillogarit mbi tekstin e ri të pastër.
 */
export function useDocumentTextCounts(htmlContent: string): TextCounts {
  return useMemo(() => {
    const plainText = getPlainTextFromContent(htmlContent);
    return getTextCounts(plainText);
  }, [htmlContent]);
}

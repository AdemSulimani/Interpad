/**
 * Nxjerrt tekstin e pastër (pa tag-e HTML) nga document.content.
 * Përdoret si burim i vetëm për word count, character count dhe character count without spaces.
 * Rastet e skajshme: content bosh, null/undefined ose gabim DOM → kthen '' (pa gabime).
 */
export function getPlainTextFromContent(htmlContent: string): string {
  if (htmlContent == null || typeof htmlContent !== 'string') {
    return '';
  }
  const trimmed = htmlContent.trim();
  if (trimmed === '') {
    return '';
  }
  try {
    const div = document.createElement('div');
    div.innerHTML = htmlContent;
    const text = div.textContent ?? div.innerText ?? '';
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

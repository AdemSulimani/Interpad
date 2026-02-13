/**
 * Rezultatet e numërimit për tekstit e pastër (për StatusBar).
 */
export interface TextCounts {
  wordCount: number;
  characterCount: number;
  characterCountNoSpaces: number;
}

/**
 * Llogarit nga teksti i pastër (një string) tre vlerat për StatusBar:
 * - characterCount: gjatësia e stringut
 * - characterCountNoSpaces: numri i karaktereve që nuk janë hapësirë (space, tab, newline)
 * - wordCount: numri i fjalëve (pjesë jo-bosh të ndara nga hapësira/tab/rresht i ri)
 *
 * Rastet e skajshme: teksti bosh ose vetëm hapësira → 0, 0, 0. Asnjëherë nuk kthen negative.
 */
export function getTextCounts(plainText: string): TextCounts {
  if (plainText == null || typeof plainText !== 'string') {
    return { wordCount: 0, characterCount: 0, characterCountNoSpaces: 0 };
  }
  if (plainText.trim() === '') {
    return { wordCount: 0, characterCount: 0, characterCountNoSpaces: 0 };
  }

  const characterCount = Math.max(0, plainText.length);
  const characterCountNoSpaces = Math.max(0, plainText.replace(/\s/g, '').length);
  const wordCount = Math.max(0, plainText.trim().split(/\s+/).length);

  return {
    wordCount,
    characterCount,
    characterCountNoSpaces,
  };
}

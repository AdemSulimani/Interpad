import { useState, useCallback, useRef, useEffect } from 'react';
import './style/FormattingToolbar.css';
import { useDocumentEditor } from './context/DocumentEditorContext';
import Modal, { ModalFooter } from './Modal';
import { uploadImage as uploadImageToBackend } from '../../services';

type AlignmentValue = 'left' | 'center' | 'right' | 'justify' | null;

/** Map vlerë execCommand fontSize (1–7) te px për shfaqje në dropdown */
const fontSizeToPx = (size: string): string => {
  const n = parseInt(size, 10);
  if (Number.isNaN(n) || n < 1 || n > 7) return '16';
  const map: Record<number, string> = { 1: '10', 2: '12', 3: '14', 4: '16', 5: '24', 6: '32', 7: '48' };
  return map[n] ?? '16';
};

/** Lexon madhësinë e fontit në px nga nyja ku është selection-i (computed style). */
function getComputedFontSizePx(editorEl: HTMLElement, range: Range): string | null {
  let node: Node | null = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE && node.parentElement) node = node.parentElement;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as HTMLElement;
  if (!editorEl.contains(el)) return null;
  const px = parseFloat(getComputedStyle(el).fontSize);
  if (Number.isNaN(px) || px < 1) return null;
  const rounded = Math.round(px);
  return String(Math.min(999, Math.max(1, rounded)));
}

const FONT_OPTIONS = [
  'Quicksand',
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Helvetica',
  'Comic Sans MS',
] as const;

const FONT_SIZE_OPTIONS = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'] as const;

/** Zgjedh fontin më të afërt nga lista (queryCommandValue mund të kthejë variante) */
function normalizeFontName(value: string): string {
  const v = value.trim();
  const found = FONT_OPTIONS.find((f) => f === v || v.indexOf(f) >= 0 || f.indexOf(v) >= 0);
  return found ?? FONT_OPTIONS[0];
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: AlignmentValue;
  fontName: string | null;
  fontSize: string | null;
}

const FormattingToolbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    alignment: null,
    fontName: null,
    fontSize: null,
  });
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const bgColorInputRef = useRef<HTMLInputElement>(null);
  const editorMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [urlDialog, setUrlDialog] = useState<{ type: 'link' | 'image' } | null>(null);
  const [urlDialogValue, setUrlDialogValue] = useState('https://');
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const {
    undo,
    redo,
    editorRef,
    setContent,
    setPageContent,
    document: editorDocument,
    focusedPageIndex,
    saveEditorSelection,
    restoreEditorSelection,
  } = useDocumentEditor();

  /** Mesazh brenda editorit (jo alert); fshihet vetë pas disa sekondave. */
  const showEditorMessage = useCallback((message: string) => {
    if (editorMessageTimeoutRef.current) clearTimeout(editorMessageTimeoutRef.current);
    setEditorMessage(message);
    editorMessageTimeoutRef.current = setTimeout(() => {
      editorMessageTimeoutRef.current = null;
      setEditorMessage(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (editorMessageTimeoutRef.current) clearTimeout(editorMessageTimeoutRef.current);
    };
  }, []);

  /**
   * Lexon queryCommandState / queryCommandValue për selection-in aktual
   * dhe përditëson state-in e toolbar-it (Bold/Italic/Underline/Alignment aktiv).
   * Thirret nga selectionchange dhe pas runFormatCommand.
   */
  const updateFormatState = useCallback(() => {
    const el = editorRef?.current;
    const sel = document.getSelection();
    if (!el || !sel || sel.rangeCount === 0) {
      setFormatState((prev) => ({ ...prev, bold: false, italic: false, underline: false, alignment: null, fontName: null, fontSize: null }));
      return;
    }
    const range = sel.getRangeAt(0);
    const inEditor =
      el.contains(range.startContainer) && el.contains(range.endContainer);
    if (!inEditor) {
      setFormatState((prev) => ({ ...prev, bold: false, italic: false, underline: false, alignment: null, fontName: null, fontSize: null }));
      return;
    }
    const bold = document.queryCommandState('bold');
    const italic = document.queryCommandState('italic');
    const underline = document.queryCommandState('underline');
    const justifyValue = document.queryCommandValue('justify');
    const alignment: AlignmentValue =
      justifyValue === 'left' || justifyValue === 'center' || justifyValue === 'right' || justifyValue === 'justify'
        ? justifyValue
        : null;
    const fontNameRaw = document.queryCommandValue('fontName');
    const fontName = fontNameRaw ? normalizeFontName(fontNameRaw) : null;
    const fontSizeFromDom = getComputedFontSizePx(el, range);
    const fontSizeRaw = document.queryCommandValue('fontSize');
    const fontSize = fontSizeFromDom ?? (fontSizeRaw ? fontSizeToPx(fontSizeRaw) : null);
    setFormatState({ bold, italic, underline, alignment, fontName, fontSize });
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateFormatState);
    return () => document.removeEventListener('selectionchange', updateFormatState);
  }, [updateFormatState]);

  /** Sinkronizon përmbajtjen e faqes së fokusuar në state: setPageContent kur ka shumë faqe, setContent përndryshe. */
  const syncEditorContentToState = useCallback(() => {
    const el = editorRef?.current;
    if (!el) return;
    if (editorDocument.pages.length > 1) {
      setPageContent(focusedPageIndex, el.innerHTML);
    } else {
      setContent(el.innerHTML);
    }
  }, [editorRef, editorDocument.pages.length, focusedPageIndex, setContent, setPageContent]);

  /**
   * Ekzekuton një komandë formatimi mbi selection-in aktual të editorit.
   * Fokuson editorin, thërret execCommand, pastaj sinkronizon përmbajtjen në state
   * dhe përditëson feedback-in vizual (updateFormatState).
   */
  const runFormatCommand = useCallback(
    (command: string, value?: string) => {
      const el = editorRef?.current;
      if (!el) return;
      el.focus();
      document.execCommand(command, false, value ?? undefined);
      syncEditorContentToState();
      updateFormatState();
    },
    [editorRef, syncEditorContentToState, updateFormatState]
  );

  const closeUrlDialog = useCallback(() => {
    setUrlDialog(null);
    setUrlDialogValue('https://');
    setUploadedImageDataUrl(null);
    if (imageFileInputRef.current) imageFileInputRef.current.value = '';
  }, []);

  const confirmUrlDialog = useCallback(() => {
    const type = urlDialog?.type;
    if (type === 'link') {
      const url = urlDialogValue.trim();
      if (!url) {
        showEditorMessage('Vendosni URL-në.');
        return;
      }
      const toUse = url.startsWith('http') ? url : `https://${url}`;
      restoreEditorSelection();
      runFormatCommand('createLink', toUse);
    } else if (type === 'image') {
      const imageSrc = uploadedImageDataUrl ?? urlDialogValue.trim();
      if (!imageSrc) {
        showEditorMessage('Vendosni URL-në e imazhit ose ngarkoni një skedar.');
        return;
      }
      const toUse = imageSrc.startsWith('http') || imageSrc.startsWith('data:') ? imageSrc : `https://${imageSrc}`;
      restoreEditorSelection();
      runFormatCommand('insertImage', toUse);
    }
    closeUrlDialog();
  }, [urlDialog?.type, urlDialogValue, uploadedImageDataUrl, restoreEditorSelection, runFormatCommand, showEditorMessage, closeUrlDialog]);

  /** Ngarkon skedarin imazh te backend; nëse dështon, përdor Data URL si rezervë. */
  const handleImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showEditorMessage('Zgjidhni një skedar imazh (jpg, png, gif, etj.).');
      return;
    }
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedImageDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    uploadImageToBackend(file)
      .then((url) => {
        setUploadedImageDataUrl(url);
      })
      .catch((err) => {
        showEditorMessage(err?.message || 'Ngarkimi dështoi. Imazhi u fut me rezervë (vetëm në këtë dokument).');
        // uploadedImageDataUrl mbetet Data URL nga FileReader (parapamje tashmë u vendos)
      })
      .finally(() => {
        setIsUploadingImage(false);
      });
  }, [showEditorMessage]);

  /** Në mousedown, ndalim që butoni të marrë fokus, që selection-i të mbetet në editor. */
  const keepSelection = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  /** Si keepSelection, por edhe ruan selection-in tani (për color picker: para se dialogu të hapet dhe fokusi të humbasë). */
  const keepAndSaveSelection = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    saveEditorSelection();
  }, [saveEditorSelection]);

  /**
   * Konverton ngjyrë RGB/RGBA në hex format
   */
  const rgbToHex = (rgb: string): string | null => {
    const rgbMatch = rgb.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      const r = parseInt(rgbMatch[0], 10);
      const g = parseInt(rgbMatch[1], 10);
      const b = parseInt(rgbMatch[2], 10);
      return `#${[r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('')}`;
    }
    return null;
  };

  /**
   * Kontrollon nëse një ngjyrë është default/transparent dhe nuk duhet të ruhet
   */
  const isDefaultColor = (color: string): boolean => {
    if (!color) return true;
    const lower = color.toLowerCase().trim();
    return (
      lower === 'rgb(0, 0, 0)' ||
      lower === '#000000' ||
      lower === '#000' ||
      lower === 'transparent' ||
      lower === 'rgba(0, 0, 0, 0)'
    );
  };

  /**
   * Kontrollon nëse një background color është default/transparent dhe nuk duhet të ruhet
   */
  const isDefaultBackgroundColor = (bgColor: string): boolean => {
    if (!bgColor) return true;
    const lower = bgColor.toLowerCase().trim();
    return (
      lower === 'rgba(0, 0, 0, 0)' ||
      lower === 'transparent' ||
      lower === 'rgb(255, 255, 255)' ||
      lower === '#ffffff' ||
      lower === '#fff'
    );
  };

  /**
   * Hapi 2 & 3: Kërkon background color në elementet prind që mbështjellin një element
   * Shkon lart në hierarki (parent, grandparent, etj.) derisa të gjendet background color ose të arrijë editor element
   * Kontrollo çdo element prind dhe ruaj background color nëse gjendet
   * 
   * Hapi 3: Trajto rastin kur background color është në element prind
   * Nëse background color gjendet në një element prind që mbështjell të gjithë selection-in, ruaje atë.
   * Kjo do të thotë që background color është aplikuar në një nivel më të lartë dhe duhet ruajtur.
   */
  const findBackgroundColorInParents = (element: HTMLElement, editorEl: HTMLElement): string | null => {
    // Filloj nga elementi aktual dhe shko lart në hierarki
    // Kjo do të kontrollojë elementet prind që mbështjellin selection-in
    let current: HTMLElement | null = element;
    
    // Hapi 2.1: Shko lart në hierarki (parent, grandparent, etj.)
    // Ndaloj kur të arrish editor element ose kur nuk ka më prind
    while (current && current !== editorEl && editorEl.contains(current)) {
      // Hapi 2.2 & 3: Kontrollo çdo element prind për background color
      // Kjo trajton rastin kur background color është në një element prind që mbështjell të gjithë selection-in
      
      // Së pari kontrollo inline style (ato kanë prioritet më të lartë)
      if (current.style.backgroundColor) {
        const bgColor = current.style.backgroundColor.trim();
        // Nëse nuk është ngjyrë default, ruaje atë
        // Hapi 3: Background color është aplikuar në një nivel më të lartë dhe duhet ruajtur
        if (!isDefaultBackgroundColor(bgColor)) {
          // Konverto në hex nëse është e nevojshme
          return bgColor.startsWith('#') ? bgColor : (rgbToHex(bgColor) || bgColor);
        }
      }
      
      // Nëse nuk u gjet në inline style, kontrollo computed style
      // Hapi 3: Kjo trajton rastin kur background color është në një element prind që mbështjell të gjithë selection-in
      const computedStyle = getComputedStyle(current);
      if (computedStyle.backgroundColor) {
        const bgColor = computedStyle.backgroundColor;
        // Nëse nuk është ngjyrë default, ruaje atë
        // Hapi 3: Background color është aplikuar në një nivel më të lartë dhe duhet ruajtur
        if (!isDefaultBackgroundColor(bgColor)) {
          // Konverto në hex nëse është e nevojshme
          return bgColor.startsWith('#') ? bgColor : (rgbToHex(bgColor) || bgColor);
        }
      }
      
      // Hapi 2.3: Shko te elementi prind (parent) për kontrollimin e radhës
      // Kjo do të kontrollojë grandparent, great-grandparent, etj.
      // Hapi 3: Kjo siguron që kontrollojmë të gjitha elementet prind që mbështjellin selection-in
      current = current.parentElement;
    }
    
    // Nëse nuk u gjet background color në asnjë element prind, kthe null
    // Kjo do të thotë që background color nuk është aplikuar në asnjë nivel më të lartë
    return null;
  };

  /**
   * Lexon ngjyrat nga një element (inline styles dhe computed styles)
   * Hapi 4: Përditëso logjikën për të kontrolluar edhe elementet prind për background color
   * Sigurohu që kur kontrollon një element, kontrollon edhe elementet prind për background color
   */
  const extractColorsFromElement = (element: HTMLElement, editorEl: HTMLElement): { color: string | null; backgroundColor: string | null } => {
    if (!editorEl.contains(element)) {
      return { color: null, backgroundColor: null };
    }

    let color: string | null = null;
    let backgroundColor: string | null = null;

    // Së pari kontrollo inline styles (ato kanë prioritet më të lartë)
    if (element.style.color) {
      const inlineColor = element.style.color.trim();
      if (!isDefaultColor(inlineColor)) {
        color = inlineColor.startsWith('#') ? inlineColor : (rgbToHex(inlineColor) || inlineColor);
      }
    }

    if (element.style.backgroundColor) {
      const inlineBgColor = element.style.backgroundColor.trim();
      if (!isDefaultBackgroundColor(inlineBgColor)) {
        backgroundColor = inlineBgColor.startsWith('#') ? inlineBgColor : (rgbToHex(inlineBgColor) || inlineBgColor);
      }
    }

    // Nëse nuk ka inline styles, lexo nga computed styles
    if (!color || !backgroundColor) {
      const computedStyle = getComputedStyle(element);
      
      if (!color) {
        const computedColor = computedStyle.color;
        if (computedColor && !isDefaultColor(computedColor)) {
          color = computedColor.startsWith('#') ? computedColor : (rgbToHex(computedColor) || computedColor);
        }
      }

      if (!backgroundColor) {
        const computedBgColor = computedStyle.backgroundColor;
        if (computedBgColor && !isDefaultBackgroundColor(computedBgColor)) {
          backgroundColor = computedBgColor.startsWith('#') ? computedBgColor : (rgbToHex(computedBgColor) || computedBgColor);
        }
      }
    }

    // Hapi 4: Nëse nuk u gjet background color në elementin aktual,
    // kontrollo elementet prind për background color
    // Kjo siguron që background color që është aplikuar në një nivel më të lartë ruhet
    if (!backgroundColor) {
      const parentBgColor = findBackgroundColorInParents(element, editorEl);
      if (parentBgColor) {
        backgroundColor = parentBgColor;
      }
    }

    return { color, backgroundColor };
  };

  /**
   * Nxjerr ngjyrat nga të gjitha elementet në selection (përfshirë elementet e brendshëm)
   * Hapi 5: Trajto rastet e veçanta:
   * - Nëse selection-i përfshin elemente me ngjyra të ndryshme, merr ngjyrat nga elementi kryesor ose nga fillimi i selection-it
   * - Nëse nuk ka ngjyra të aplikuara, kthen null (mos shto ato në <span>)
   * 
   * Hapi 1: Përmirëso funksionin për të kontrolluar edhe elementet prind që mbështjellin selection-in
   */
  const extractColorsFromSelection = (range: Range, editorEl: HTMLElement): { color: string | null; backgroundColor: string | null } => {
    let foundColor: string | null = null;
    let foundBackgroundColor: string | null = null;

    // Hapi 5.1: Merr ngjyrat nga elementi kryesor (fillimi i selection-it)
    // Kjo është strategjia kryesore: nëse ka ngjyra të ndryshme, përdor ato nga fillimi
    let startNode: Node | null = range.startContainer;
    if (startNode.nodeType === Node.TEXT_NODE && startNode.parentElement) {
      startNode = startNode.parentElement;
    }
    
    // Gjej elementin më të afërt që ka stil inline ose computed style me ngjyrë
    let currentNode: HTMLElement | null = null;
    if (startNode.nodeType === Node.ELEMENT_NODE) {
      currentNode = startNode as HTMLElement;
    }
    
    // Nëse nuk është element, provo të gjesh elementin prind më të afërt
    if (!currentNode && startNode.parentElement) {
      currentNode = startNode.parentElement;
    }
    
    // Kontrollo elementin kryesor (fillimi i selection-it) për ngjyra
    if (currentNode && editorEl.contains(currentNode)) {
      const colors = extractColorsFromElement(currentNode, editorEl);
      // Ruaj ngjyrat nga elementi kryesor si default
      if (colors.color) {
        foundColor = colors.color;
      }
      if (colors.backgroundColor) {
        foundBackgroundColor = colors.backgroundColor;
      }
      
      // Hapi 2 & 3: Shto logjikë për të kërkuar në elementet prind
      // Nga elementi ku fillon selection-i, shko lart në hierarki (parent, grandparent, etj.)
      // Kontrollo çdo element prind derisa të arrish në editor element
      // Nëse gjen background color në ndonjë element prind, ruaje atë
      // 
      // Hapi 3: Trajto rastin kur background color është në element prind
      // Nëse background color gjendet në një element prind që mbështjell të gjithë selection-in, ruaje atë.
      // Kjo do të thotë që background color është aplikuar në një nivel më të lartë dhe duhet ruajtur.
      if (!foundBackgroundColor && currentNode) {
        const parentBgColor = findBackgroundColorInParents(currentNode, editorEl);
        if (parentBgColor) {
          // Hapi 3: Ruaj background color që u gjet në element prind që mbështjell të gjithë selection-in
          foundBackgroundColor = parentBgColor;
        }
      }
    }

    // Hapi 5.2: Kontrollo elementet e brendshëm në selection
    // Nëse ka elemente me inline styles eksplicite, ato kanë prioritet më të lartë
    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);

    // Gjej të gjitha elementet që kanë inline styles për color ose background-color
    const allElements = tempDiv.querySelectorAll('*');
    const foundColors = new Set<string>();
    const foundBgColors = new Set<string>();

    for (const elem of Array.from(allElements)) {
      const htmlElem = elem as HTMLElement;
      const colors = extractColorsFromElement(htmlElem, editorEl);
      
      // Kontrollo nëse ka inline styles eksplicite (ato kanë prioritet)
      if (htmlElem.style.color && colors.color) {
        foundColors.add(colors.color);
        // Nëse ka inline style eksplicit, përdor atë (prioritet më i lartë)
        foundColor = colors.color;
      }
      if (htmlElem.style.backgroundColor && colors.backgroundColor) {
        foundBgColors.add(colors.backgroundColor);
        // Nëse ka inline style eksplicit, përdor atë (prioritet më i lartë)
        foundBackgroundColor = colors.backgroundColor;
      }
    }

    // Hapi 2 & 3 (shtesë): Nëse nuk u gjet background color nga elementet e brendshëm,
    // kontrollo përsëri elementet prind të elementit kryesor
    // 
    // Hapi 3: Trajto rastin kur background color është në element prind
    // Kjo trajton rastin kur background color është në një element prind që mbështjell të gjithë selection-in
    // Shkon lart në hierarki (parent, grandparent, etj.) dhe kontrollon çdo element prind
    // Nëse background color gjendet në një element prind që mbështjell të gjithë selection-in, ruaje atë.
    // Kjo do të thotë që background color është aplikuar në një nivel më të lartë dhe duhet ruajtur.
    if (!foundBackgroundColor && currentNode) {
      const parentBgColor = findBackgroundColorInParents(currentNode, editorEl);
      if (parentBgColor) {
        // Hapi 3: Ruaj background color që u gjet në element prind që mbështjell të gjithë selection-in
        // Background color është aplikuar në një nivel më të lartë dhe duhet ruajtur
        foundBackgroundColor = parentBgColor;
      }
    }

    // Hapi 5.3: Trajto rastin kur ka ngjyra të ndryshme
    // Nëse ka më shumë se një ngjyrë të ndryshme, përdor ngjyrat nga elementi kryesor (fillimi)
    // Logjika: Nëse ka ngjyra të ndryshme, foundColor dhe foundBackgroundColor tashmë janë vendosur
    // nga elementi kryesor në fillim, kështu që ato do të mbeten si ngjyra kryesore
    // Elementet e brendshëm me inline styles mund të mbishkruajnë, por nëse ka konflikte,
    // ngjyrat nga elementi kryesor (fillimi i selection-it) kanë prioritet

    // Hapi 5.4: Sigurohu që nuk kthejmë ngjyra default
    // Nëse ngjyrat e gjetura janë default, kthe null (mos shto ato në <span>)
    if (foundColor && isDefaultColor(foundColor)) {
      foundColor = null;
    }
    if (foundBackgroundColor && isDefaultBackgroundColor(foundBackgroundColor)) {
      foundBackgroundColor = null;
    }

    // Kthe ngjyrat (null nëse nuk ka ngjyra të aplikuara)
    return {
      color: foundColor,
      backgroundColor: foundBackgroundColor,
    };
  };

  /** Madhësi fonti në px → execCommand fontSize (1–7) */
  /**
   * Aplikon madhësinë e fontit në px duke mbështjellë selection-in në <span style="font-size: Npx">,
   * që 8, 9 etj. të jenë vërtet 8px, 9px (execCommand('fontSize') pranon vetëm 1–7 dhe 8/9 bëheshin ~10px).
   * Lexon dhe ruan ngjyrat ekzistuese (color dhe background-color) nga selection-i aktual dhe elementet e brendshëm.
   */
  const applyFontSize = useCallback(
    (pxValue: string) => {
      const px = parseInt(pxValue, 10);
      const sizePx = Number.isNaN(px) || px < 1 ? 16 : Math.min(999, Math.max(1, px));
      const el = editorRef?.current;
      if (!el) return;
      el.focus();
      restoreEditorSelection();
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return;
      
      // Hapi 3: Ruaj ngjyrat në variabla PARA se të aplikosh font size
      // Nxjerr ngjyrat ekzistuese nga selection-i dhe elementet e brendshëm
      const { color: existingColor, backgroundColor: existingBackgroundColor } = extractColorsFromSelection(range, el);
      
      // Variablat që ruajnë ngjyrat ekzistuese
      // Nëse ka color ose backgroundColor, ato janë tashmë të ruajtura në këto variabla
      const preservedTextColor: string | null = existingColor || null;
      const preservedBackgroundColor: string | null = existingBackgroundColor || null;
      
      // Tani aplikojmë font size duke përfshirë ngjyrat e ruajtura
      const fragment = range.cloneContents();
      const wrap = document.createElement('div');
      wrap.appendChild(fragment);
      let inner = wrap.innerHTML || range.toString() || '';
      if (range.collapsed || !inner.trim()) inner = '&#8203;';
      
      // Hapi 4: Bashko stilat në <span> të ri
      // Kur krijon <span> për font size, shto edhe color dhe background-color nëse ekzistojnë
      // Formato si: <span style="font-size: ${sizePx}px; color: ${existingColor}; background-color: ${existingBgColor}">
      
      // Hapi 5: Trajto rastet e veçanta
      // Nëse nuk ka ngjyra të aplikuara, mos shto ato në <span>
      // Kontrolli if (preservedTextColor) dhe if (preservedBackgroundColor) siguron që vetëm ngjyrat e aplikuara shtohen
      
      // Krijo style string duke filluar me font-size
      const styleParts: string[] = [`font-size: ${sizePx}px`];
      
      // Shto color nëse ka një ngjyrë të ruajtur (vetëm nëse nuk është null/undefined)
      // Hapi 5: Nëse nuk ka ngjyra të aplikuara, mos shto ato në <span>
      if (preservedTextColor) {
        styleParts.push(`color: ${preservedTextColor}`);
      }
      
      // Shto background-color nëse ka një ngjyrë të ruajtur (vetëm nëse nuk është null/undefined)
      // Hapi 5: Nëse nuk ka ngjyra të aplikuara, mos shto ato në <span>
      if (preservedBackgroundColor) {
        styleParts.push(`background-color: ${preservedBackgroundColor}`);
      }
      
      // Bashko të gjitha stilat në një string të vetëm, të ndarë me '; '
      const styleString = styleParts.join('; ');
      
      // Krijo <span> tag-un me të gjitha stilat e bashkuara
      const wrapped = `<span style="${styleString}">${inner}</span>`;
      document.execCommand('insertHTML', false, wrapped);
      syncEditorContentToState();
      updateFormatState();
    },
    [editorRef, restoreEditorSelection, syncEditorContentToState, updateFormatState]
  );

  /**
   * Hapi 7 – Text Color: ruaj ngjyrën në state, rikthe selection, execCommand('foreColor', hex), setContent nga runFormatCommand.
   * Input type="color" është i fshehur; hapet me klik në butonin e toolbar-it.
   */
  const applyTextColor = useCallback(
    (hex: string) => {
      setTextColor(hex);
      restoreEditorSelection();
      runFormatCommand('foreColor', hex);
    },
    [restoreEditorSelection, runFormatCommand]
  );

  /**
   * Hapi 7 – Background Color: ruaj ngjyrën në state, rikthe selection, execCommand('hiliteColor', hex), setContent nga runFormatCommand.
   * Input type="color" i fshehur; hapet me klik në butonin e toolbar-it; color-indicator tregon ngjyrën e zgjedhur.
   */
  const applyBackgroundColor = useCallback(
    (hex: string) => {
      setBackgroundColor(hex);
      restoreEditorSelection();
      runFormatCommand('hiliteColor', hex);
    },
    [restoreEditorSelection, runFormatCommand]
  );

  /**
   * Hapi 8 – Link: prompt për URL, pastaj execCommand('createLink', false, url).
   * Nëse nuk ka selection (tekst të zgjedhur), tregon mesazh dhe nuk hap prompt.
   */
  const insertLink = useCallback(() => {
    restoreEditorSelection();
    const el = editorRef?.current;
    const sel = document.getSelection();
    const hasSelection =
      el &&
      sel &&
      sel.rangeCount > 0 &&
      el.contains(sel.getRangeAt(0).startContainer) &&
      !sel.getRangeAt(0).collapsed &&
      sel.toString().trim() !== '';
    if (!hasSelection) {
      showEditorMessage('Zgjidhni tekstin që dëshironi ta shndërroni në link.');
      return;
    }
    setUrlDialogValue('https://');
    setUrlDialog({ type: 'link' });
  }, [editorRef, restoreEditorSelection, showEditorMessage]);

  /**
   * Hapi 8 – Image: modal brenda editorit për URL, pastaj execCommand('insertImage', false, imageUrl).
   */
  const insertImage = useCallback(() => {
    restoreEditorSelection();
    setUrlDialogValue('https://');
    setUrlDialog({ type: 'image' });
  }, [restoreEditorSelection]);

  return (
    <div className="formatting-toolbar">
      {/* Mobile Menu Toggle Button */}
      <button
        className="toolbar-mobile-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle formatting options"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <span>Format</span>
      </button>

      {/* Desktop Toolbar */}
      <div className="formatting-toolbar-container toolbar-desktop">
        {/* Formatting Buttons: Bold, Italic, Underline – active nga queryCommandState */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${formatState.bold ? 'active' : ''}`}
            title="Bold"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('bold')}
            aria-label="Bold"
            aria-pressed={formatState.bold}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
            </svg>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${formatState.italic ? 'active' : ''}`}
            title="Italic"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('italic')}
            aria-label="Italic"
            aria-pressed={formatState.italic}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="4" x2="10" y2="4"/>
              <line x1="14" y1="20" x2="5" y2="20"/>
              <line x1="15" y1="4" x2="9" y2="20"/>
            </svg>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${formatState.underline ? 'active' : ''}`}
            title="Underline"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('underline')}
            aria-label="Underline"
            aria-pressed={formatState.underline}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
              <line x1="4" y1="21" x2="20" y2="21"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* Font: restoreEditorSelection + execCommand('fontName'); value nga queryCommandValue */}
        <div className="toolbar-group">
          <select
            className="toolbar-dropdown font-select"
            value={formatState.fontName ?? FONT_OPTIONS[0]}
            onChange={(e) => {
              restoreEditorSelection();
              runFormatCommand('fontName', e.target.value);
            }}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-divider"></div>

        {/* Font size: map px → 1–7, restoreEditorSelection + execCommand; value nga queryCommandValue */}
        <div className="toolbar-group">
          <select
            className="toolbar-dropdown font-size-select"
            value={formatState.fontSize ?? '16'}
            onChange={(e) => {
              restoreEditorSelection();
              applyFontSize(e.target.value);
            }}
          >
            {FONT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="toolbar-divider"></div>

        {/* Hapi 7 – Color pickers: input type="color" i fshehur, hapet me klik; foreColor/hiliteColor + setContent; color-indicator */}
        <div className="toolbar-group">
          <div className="color-picker-wrapper">
            <input
              ref={textColorInputRef}
              type="color"
              value={textColor}
              onChange={(e) => applyTextColor(e.target.value)}
              className="toolbar-color-input"
              aria-label="Text color"
            />
            <button
              type="button"
              className="toolbar-btn color-picker-btn"
              title="Text Color"
              onMouseDown={keepAndSaveSelection}
              onClick={() => textColorInputRef.current?.click()}
              aria-label="Text Color"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 2 16 8 22 8"/>
                <path d="M21 10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10"/>
              </svg>
              <span className="color-indicator text-color-indicator" style={{ backgroundColor: textColor }}></span>
            </button>
            <input
              ref={bgColorInputRef}
              type="color"
              value={backgroundColor}
              onChange={(e) => applyBackgroundColor(e.target.value)}
              className="toolbar-color-input"
              aria-label="Background color"
            />
            <button
              type="button"
              className="toolbar-btn color-picker-btn"
              title="Background Color"
              onMouseDown={keepAndSaveSelection}
              onClick={() => bgColorInputRef.current?.click()}
              aria-label="Background Color"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              </svg>
              <span className="color-indicator bg-color-indicator" style={{ backgroundColor: backgroundColor, border: '1px solid #ccc' }}></span>
            </button>
          </div>
        </div>

        <div className="toolbar-divider"></div>

        {/* Alignment Buttons – active nga queryCommandValue('justify') */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${formatState.alignment === 'left' ? 'active' : ''}`}
            title="Align Left"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('justifyLeft')}
            aria-label="Align Left"
            aria-pressed={formatState.alignment === 'left'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="7" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="21" y1="18" x2="7" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${formatState.alignment === 'center' ? 'active' : ''}`}
            title="Align Center"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('justifyCenter')}
            aria-label="Align Center"
            aria-pressed={formatState.alignment === 'center'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="10" x2="6" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="18" y1="18" x2="6" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${formatState.alignment === 'right' ? 'active' : ''}`}
            title="Align Right"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('justifyRight')}
            aria-label="Align Right"
            aria-pressed={formatState.alignment === 'right'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="7" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="21" y1="18" x2="7" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${formatState.alignment === 'justify' ? 'active' : ''}`}
            title="Justify"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('justifyFull')}
            aria-label="Justify"
            aria-pressed={formatState.alignment === 'justify'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="3" y2="10"/>
              <line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/>
              <line x1="21" y1="18" x2="3" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* List Buttons – onMouseDown keepSelection */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            title="Bullet List"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('insertUnorderedList')}
            aria-label="Bullet List"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="6" r="2"/>
              <circle cx="8" cy="12" r="2"/>
              <circle cx="8" cy="18" r="2"/>
              <line x1="12" y1="6" x2="20" y2="6"/>
              <line x1="12" y1="12" x2="20" y2="12"/>
              <line x1="12" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            title="Numbered List"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('insertOrderedList')}
            aria-label="Numbered List"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* Indent/Outdent Buttons – onMouseDown keepSelection */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            title="Decrease Indent"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('outdent')}
            aria-label="Decrease Indent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="7 13 3 9 7 5"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
            </svg>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            title="Increase Indent"
            onMouseDown={keepSelection}
            onClick={() => runFormatCommand('indent')}
            aria-label="Increase Indent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 13 21 9 17 5"/>
              <line x1="21" y1="9" x2="3" y2="9"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* Link and Image – restoreEditorSelection + prompt + execCommand */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            title="Insert Link"
            onClick={insertLink}
            aria-label="Insert Link"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button
            type="button"
            className="toolbar-btn"
            title="Insert Image"
            onClick={insertImage}
            aria-label="Insert Image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
        </div>

        <div className="toolbar-divider"></div>

        {/* Undo/Redo Buttons */}
        <div className="toolbar-group">
          <button type="button" className="toolbar-btn" title="Undo" onClick={undo} aria-label="Undo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6"/>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </button>
          <button type="button" className="toolbar-btn" title="Redo" onClick={redo} aria-label="Redo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6"/>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mesazh brenda editorit (jo alert) – Link / Image */}
      {editorMessage && (
        <div className="editor-inline-message" role="status" aria-live="polite">
          {editorMessage}
        </div>
      )}

      {/* Hapi 9 – Mobile toolbar: Bold, Italic, Underline, font, size, link, image me të njëjtën logjikë (keepSelection/restoreEditorSelection, execCommand, setContent) */}
      <div className={`toolbar-mobile-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="toolbar-mobile-menu-content">
          {/* Bold, Italic, Underline – keepSelection + runFormatCommand */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-section-title">Text Formatting</div>
            <div className="mobile-menu-buttons">
              <button
                type="button"
                className={`toolbar-btn mobile-btn ${formatState.bold ? 'active' : ''}`}
                title="Bold"
                onMouseDown={keepSelection}
                onClick={() => runFormatCommand('bold')}
                aria-label="Bold"
                aria-pressed={formatState.bold}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                  <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                </svg>
                <span>Bold</span>
              </button>
              <button
                type="button"
                className={`toolbar-btn mobile-btn ${formatState.italic ? 'active' : ''}`}
                title="Italic"
                onMouseDown={keepSelection}
                onClick={() => runFormatCommand('italic')}
                aria-label="Italic"
                aria-pressed={formatState.italic}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="4" x2="10" y2="4"/>
                  <line x1="14" y1="20" x2="5" y2="20"/>
                  <line x1="15" y1="4" x2="9" y2="20"/>
                </svg>
                <span>Italic</span>
              </button>
              <button
                type="button"
                className={`toolbar-btn mobile-btn ${formatState.underline ? 'active' : ''}`}
                title="Underline"
                onMouseDown={keepSelection}
                onClick={() => runFormatCommand('underline')}
                aria-label="Underline"
                aria-pressed={formatState.underline}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
                  <line x1="4" y1="21" x2="20" y2="21"/>
                </svg>
                <span>Underline</span>
              </button>
            </div>
          </div>

          {/* Font & Size – restoreEditorSelection + runFormatCommand/applyFontSize (dropdown merr fokusin) */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-section-title">Font</div>
            <div className="mobile-menu-dropdowns">
              <select
                className="toolbar-dropdown mobile-dropdown"
                value={formatState.fontName ?? FONT_OPTIONS[0]}
                onChange={(e) => {
                  restoreEditorSelection();
                  runFormatCommand('fontName', e.target.value);
                }}
              >
                {FONT_OPTIONS.slice(0, 4).map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              <select
                className="toolbar-dropdown mobile-dropdown"
                value={formatState.fontSize && ['14', '16', '18', '20'].includes(formatState.fontSize) ? formatState.fontSize : '16'}
                onChange={(e) => {
                  restoreEditorSelection();
                  applyFontSize(e.target.value);
                }}
              >
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
              </select>
            </div>
          </div>

          {/* Link & Image – insertLink/insertImage (restoreEditorSelection + prompt + execCommand) */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-section-title">Quick Actions</div>
            <div className="mobile-menu-buttons">
              <button
                type="button"
                className="toolbar-btn mobile-btn"
                title="Insert Link"
                onClick={insertLink}
                aria-label="Insert Link"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span>Link</span>
              </button>
              <button
                type="button"
                className="toolbar-btn mobile-btn"
                title="Insert Image"
                onClick={insertImage}
                aria-label="Insert Image"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal për URL – Link / Image (brenda editorit, jo prompt i shfletuesit) */}
      <Modal
        isOpen={!!urlDialog}
        onClose={closeUrlDialog}
        title={urlDialog?.type === 'link' ? 'Shto link' : 'Shto imazh'}
        size="small"
        footer={
          <ModalFooter
            cancelText="Anulo"
            confirmText={isUploadingImage ? 'Duke ngarkuar...' : 'Shto'}
            onCancel={closeUrlDialog}
            onConfirm={confirmUrlDialog}
            confirmVariant="primary"
            isLoading={isUploadingImage}
          />
        }
      >
        <div className="modal-form-group">
          <label className="modal-form-label" htmlFor="editor-url-input">
            {urlDialog?.type === 'link' ? 'URL e linkut' : 'URL e imazhit'}
          </label>
          <input
            id="editor-url-input"
            type="url"
            className="modal-form-input"
            value={urlDialogValue}
            onChange={(e) => {
              setUrlDialogValue(e.target.value);
              if (urlDialog?.type === 'image') setUploadedImageDataUrl(null);
            }}
            placeholder="https://"
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmUrlDialog();
              if (e.key === 'Escape') closeUrlDialog();
            }}
            readOnly={urlDialog?.type === 'image' && !!uploadedImageDataUrl}
          />
        </div>
        {urlDialog?.type === 'image' && (
          <div className="modal-form-group editor-image-upload">
            <span className="modal-form-label">Ose ngarkoni imazh</span>
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="editor-image-file-input"
              aria-label="Zgjidhni skedar imazhi"
            />
            {isUploadingImage && (
              <p className="editor-image-upload-loading">Duke ngarkuar imazhin te serveri...</p>
            )}
            {uploadedImageDataUrl && !isUploadingImage && (
              <div className="editor-image-upload-preview">
                <img src={uploadedImageDataUrl} alt="Parapamje" />
                <span className="editor-image-upload-label">Imazhi u zgjidh</span>
                <button
                  type="button"
                  className="editor-image-upload-clear"
                  onClick={() => {
                    setUploadedImageDataUrl(null);
                    if (imageFileInputRef.current) imageFileInputRef.current.value = '';
                  }}
                >
                  Ndrysho skedar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FormattingToolbar;


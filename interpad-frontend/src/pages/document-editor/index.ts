export { default as DocumentEditorHeader } from './DocumentEditorHeader';
export { default as FormattingToolbar } from './FormattingToolbar';
export { default as EditorArea } from './EditorArea';
export { default as DocumentSidebar } from './DocumentSidebar';
export { default as StatusBar } from './StatusBar';
export { DocumentSkeletonLoader, SaveSpinner, UploadProgressBar, Spinner } from './LoadingStates';
export { default as Modal, ModalFooter } from './Modal';
export { 
  AutoSaveIndicator, 
  UnsavedChangesIndicator, 
  ConnectionStatus, 
  Toast, 
  ToastContainer 
} from './VisualIndicators';
export type { ToastType } from './VisualIndicators';
export { default as DocumentEditorPage } from './DocumentEditorPage';
export * from './components';
export type { DocumentModel } from './types/document';
export { getDocumentContent, documentFromApiContent } from './types/document';
export { getPlainTextFromContent } from './utils/getPlainTextFromContent';
export { getTextCounts, type TextCounts } from './utils/getTextCounts';
export {
  getDocumentPageHeightPx,
  measurePageContentHeight,
  getPageOverflow,
  hasPageOverflow,
  MEASURE_CLASS,
  MEASURE_WRAPPER_ID,
  type PageOverflowResult,
} from './utils/measurePageOverflow';
export { splitPageContent, splitContentIntoPages, type SplitPageContentResult } from './utils/splitPageContent';
export { useDocumentTextCounts } from './hooks/useDocumentTextCounts';
export { usePageOverflow } from './hooks/usePageOverflow';
export { DocumentEditorProvider, useDocumentEditor } from './context/DocumentEditorContext';
export type { DocumentEditorContextValue, SaveStatus } from './context/DocumentEditorContext';


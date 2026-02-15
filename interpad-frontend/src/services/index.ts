const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface UploadImageResponse {
  success: boolean;
  url?: string;
  filename?: string;
  message?: string;
}

/** Ngarkon një skedar imazh te backend dhe kthen URL-në e imazhit. */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE_URL}/api/upload/image`, {
    method: 'POST',
    body: formData,
  });

  const data = (await res.json()) as UploadImageResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Ngarkimi dështoi.');
  }

  if (!data.url) {
    throw new Error('Serveri nuk ktheu URL.');
  }

  return data.url;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  token?: string;
  requiresVerification?: boolean;
  userId?: string;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as AuthResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Register failed');
  }

  return data;
}

export async function loginUser(payload: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as AuthResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data;
}

export async function verifyAuthCode(payload: {
  email: string;
  code: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as AuthResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Verification failed');
  }

  return data;
}

export async function resendVerificationCode(payload: { email: string }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/resend-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as AuthResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to resend code');
  }

  return data;
}

export async function forgotPassword(payload: { email: string }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as AuthResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to send password reset email');
  }

  return data;
}

export async function resetPassword(payload: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as AuthResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to reset password');
  }

  return data;
}

export interface LinkGoogleAccountResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  redirectUrl?: string;
}

export async function linkGoogleAccount(payload: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/google/link-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important për session cookies
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as LinkGoogleAccountResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to link Google account');
  }

  return data;
}

// ——— Document API (kërkon JWT) ———

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface DocumentApiDoc {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface DocumentCreateResponse {
  success: boolean;
  document: DocumentApiDoc;
  message?: string;
}

export interface DocumentUpdateResponse {
  success: boolean;
  document: DocumentApiDoc;
  message?: string;
}

/** Krijon dokument të ri. Kërkon JWT. */
export async function createDocument(payload: {
  title: string;
  content: string;
}): Promise<DocumentApiDoc> {
  const res = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as DocumentCreateResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to create document');
  }

  if (!data.document) {
    throw new Error('Server did not return document');
  }

  return data.document;
}

export interface DocumentGetOneResponse {
  success: boolean;
  document: DocumentApiDoc;
  message?: string;
}

/** Merr një dokument me id. Kërkon JWT. */
export async function getDocument(documentId: string): Promise<DocumentApiDoc> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = (await res.json()) as DocumentGetOneResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to load document');
  }

  if (!data.document) {
    throw new Error('Server did not return document');
  }

  return data.document;
}

/** Përditëson dokument ekzistues. Kërkon JWT. */
export async function updateDocument(
  documentId: string,
  payload: { title: string; content: string }
): Promise<DocumentApiDoc> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as DocumentUpdateResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to update document');
  }

  if (!data.document) {
    throw new Error('Server did not return document');
  }

  return data.document;
}

export interface RecentDocumentItem {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentRecentResponse {
  success: boolean;
  documents: RecentDocumentItem[];
  message?: string;
}

/** Merr listën e dokumenteve të fundit për user-in e loguar. Kërkon JWT. */
export async function getRecentDocuments(): Promise<RecentDocumentItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = (await res.json()) as DocumentRecentResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to get recent documents');
  }

  return data.documents ?? [];
}

// ——— Comments API (kërkon JWT) ———

export interface CommentAnchor {
  pageIndex?: number;
  startOffset?: number;
  endOffset?: number;
  selectedText?: string;
}

export interface DocumentCommentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  author: DocumentCommentAuthor;
  content: string;
  anchor: CommentAnchor | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCommentsResponse {
  success: boolean;
  comments: DocumentComment[];
  message?: string;
}

export interface CreateCommentResponse {
  success: boolean;
  comment: DocumentComment;
  message?: string;
}

/** Merr komentet për një dokument. Kërkon JWT. */
export async function getDocumentComments(documentId: string): Promise<DocumentComment[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/comments`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = (await res.json()) as DocumentCommentsResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to load comments');
  }

  return data.comments ?? [];
}

/** Krijon një koment për dokumentin. Kërkon JWT. */
export async function createDocumentComment(
  documentId: string,
  payload: { content: string; anchor?: CommentAnchor | null }
): Promise<DocumentComment> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as CreateCommentResponse;

  if (!res.ok) {
    throw new Error(data.message || 'Failed to create comment');
  }

  if (!data.comment) {
    throw new Error('Server did not return comment');
  }

  return data.comment;
}

/** Përditëson resolved për një koment. Kërkon JWT. */
export async function resolveDocumentComment(
  documentId: string,
  commentId: string,
  resolved: boolean
): Promise<DocumentComment> {
  const res = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/comments/${commentId}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resolved }),
    }
  );

  const data = (await res.json()) as { success?: boolean; comment?: DocumentComment; message?: string };

  if (!res.ok) {
    throw new Error(data.message || 'Failed to update comment');
  }
  if (!data.comment) {
    throw new Error('Server did not return comment');
  }
  return data.comment;
}

/** Fshin një koment. Kërkon JWT. */
export async function deleteDocumentComment(
  documentId: string,
  commentId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/documents/${documentId}/comments/${commentId}`,
    { method: 'DELETE', headers: getAuthHeaders() }
  );

  const data = (await res.json()) as { success?: boolean; message?: string };

  if (!res.ok) {
    throw new Error(data.message || 'Failed to delete comment');
  }
}


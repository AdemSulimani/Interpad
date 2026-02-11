const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

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


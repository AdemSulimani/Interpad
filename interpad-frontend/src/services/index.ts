const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
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
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
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
  const res = await fetch(`${API_BASE_URL}/auth/verify-code`, {
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
  const res = await fetch(`${API_BASE_URL}/auth/resend-code`, {
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


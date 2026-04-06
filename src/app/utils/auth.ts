import { getApiBase, parseJsonResponse } from './api';

const JWT_KEY = 'cms_jwt';

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const res = await fetch(`${getApiBase()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
    if (!res.ok) {
      return { ok: false, reason: data.error || 'Sign-in failed. Is the API running?' };
    }
    if (!data.token) {
      return { ok: false, reason: 'Invalid response from server.' };
    }
    sessionStorage.setItem(JWT_KEY, data.token);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Cannot reach the API. Start the server and check your network.' };
  }
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(JWT_KEY);
}

function readToken(): string | null {
  return sessionStorage.getItem(JWT_KEY);
}

export async function verifyAdminSession(): Promise<boolean> {
  const token = readToken();
  if (!token) return false;
  try {
    const res = await fetch(`${getApiBase()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      sessionStorage.removeItem(JWT_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function decodeJwtPayload(token: string): { email?: string; exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (b64.length % 4)) % 4;
    const padded = b64 + '='.repeat(pad);
    return JSON.parse(atob(padded)) as { email?: string; exp?: number };
  } catch {
    return null;
  }
}

export function peekAdminEmail(): string | null {
  const token = readToken();
  if (!token) return null;
  const json = decodeJwtPayload(token);
  if (!json) return null;
  if (typeof json.exp === 'number' && json.exp * 1000 <= Date.now()) {
    sessionStorage.removeItem(JWT_KEY);
    return null;
  }
  return typeof json.email === 'string' ? json.email : null;
}

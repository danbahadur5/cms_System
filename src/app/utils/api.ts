/** Empty string = same origin (use Vite dev proxy to the API). */
export function getApiBase(): string {
  const base = import.meta.env.VITE_API_URL;
  return typeof base === 'string' ? base.replace(/\/$/, '') : '';
}

/**
 * Base URL for multipart uploads. In Vite dev, calls go straight to the API so FormData is not
 * broken by the dev proxy; other requests still use getApiBase() + proxy.
 */
export function getUploadApiBase(): string {
  const explicit = getApiBase();
  if (explicit) return explicit;
  if (import.meta.env.DEV) {
    return `http://127.0.0.1:${__COURSE_API_PORT__}`;
  }
  return '';
}

/** Origin used for static files served by the API (`/uploads/...`). */
export function getMediaApiOrigin(): string {
  const base = getApiBase();
  if (base) return base;
  if (import.meta.env.DEV) {
    return `http://127.0.0.1:${__COURSE_API_PORT__}`;
  }
  return '';
}

/**
 * Turn stored lesson image refs into a browser-loadable URL.
 * - Absolute `http(s)://` and `data:` URLs are unchanged.
 * - Paths like `/uploads/...` are prefixed with the API origin in dev (Vite does not serve `/uploads`).
 */
export function resolveMediaUrl(stored: string | null | undefined): string {
  if (stored == null) return '';
  const s = stored.trim();
  if (!s) return '';
  if (s.startsWith('data:')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return s;
  if (s.startsWith('/')) {
    const origin = getMediaApiOrigin();
    return origin ? `${origin}${s}` : s;
  }
  return s;
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem('cms_jwt');
}

export function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Request failed');
  }
  return data as T;
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

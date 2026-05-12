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
    // Return empty to use relative URLs and the Vite proxy
    return '';
  }
  return '';
}

/** Origin used for static files served by the API (`/uploads/...`). */
export function getMediaApiOrigin(): string {
  const base = getApiBase();
  if (base) return base;
  // If no explicit API URL is set, return empty to use relative URLs and the Vite proxy
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

export function getSiteAccessToken(): string | null {
  return sessionStorage.getItem('site-access-token');
}

export function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const siteToken = getSiteAccessToken();
  if (siteToken) {
    headers['x-site-access'] = siteToken;
  }
  
  return headers;
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 403 && data.error?.includes('Site access')) {
      // Clear site access token if server rejects it
      sessionStorage.removeItem('site-access-token');
      window.location.reload(); // Force reload to show PasswordGate
    }
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

import type { Course, Topic, Lesson } from '../types/course';
import { authHeaders, getApiBase, getAuthToken, getUploadApiBase, parseJsonResponse } from './api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`);
  return parseJsonResponse<T>(res);
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  const auth = authHeaders() as Record<string, string>;
  if (auth.Authorization) headers.Authorization = auth.Authorization;
  if (init.body && !(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  return parseJsonResponse<T>(res);
}

export async function fetchPublicStats(): Promise<{ courses: number; lessons: number }> {
  return get('/api/stats');
}

export async function fetchCourses(): Promise<Course[]> {
  return get('/api/courses');
}

export async function fetchCourse(id: string): Promise<Course | null> {
  try {
    return await get<Course>(`/api/courses/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchTopicsByCourse(courseId: string): Promise<Topic[]> {
  try {
    return await get<Topic[]>(`/api/courses/${encodeURIComponent(courseId)}/topics`);
  } catch {
    return [];
  }
}

export async function fetchTopic(topicId: string): Promise<Topic | null> {
  try {
    return await get<Topic>(`/api/topics/${encodeURIComponent(topicId)}`);
  } catch {
    return null;
  }
}

export async function fetchLessonsByTopic(topicId: string): Promise<Lesson[]> {
  try {
    return await get<Lesson[]>(`/api/topics/${encodeURIComponent(topicId)}/lessons`);
  } catch {
    return [];
  }
}

export type AdminTree = {
  courses: Course[];
  topics: Topic[];
  lessons: Lesson[];
};

export async function fetchAdminTree(): Promise<AdminTree> {
  return send<AdminTree>('/api/admin/tree', { method: 'GET' });
}

export async function createCourse(
  body: Pick<Course, 'name' | 'description' | 'icon' | 'color' | 'order'>
): Promise<Course> {
  return send<Course>('/api/courses', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
  return send<Course>(`/api/courses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteCourse(id: string): Promise<void> {
  await send<{ ok: boolean }>(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createTopic(body: Omit<Topic, 'id'>): Promise<Topic> {
  const { courseId, ...rest } = body;
  return send<Topic>(`/api/courses/${encodeURIComponent(courseId)}/topics`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

export async function updateTopic(id: string, updates: Partial<Topic>): Promise<Topic> {
  return send<Topic>(`/api/topics/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteTopic(id: string): Promise<void> {
  await send<{ ok: boolean }>(`/api/topics/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createLesson(body: Omit<Lesson, 'id'>): Promise<Lesson> {
  const { topicId, ...rest } = body;
  return send<Lesson>(`/api/topics/${encodeURIComponent(topicId)}/lessons`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

export async function updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson> {
  return send<Lesson>(`/api/lessons/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await send<{ ok: boolean }>(`/api/lessons/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function uploadLessonImage(file: File): Promise<string> {
  if (!getAuthToken()) {
    throw new Error('Sign in again as staff — your session is missing, so uploads are blocked.');
  }
  const fd = new FormData();
  fd.append('file', file, file.name || 'image');

  const base = getUploadApiBase();
  const headers = authHeaders() as Record<string, string>;
  const authHeader: HeadersInit = headers.Authorization
    ? { Authorization: headers.Authorization }
    : {};

  let res: Response;
  try {
    res = await fetch(`${base}/api/upload`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: authHeader,
      body: fd,
    });
  } catch (e) {
    const hint =
      base.startsWith('http://127.0.0.1') || base.startsWith('http://localhost')
        ? ' Check that the API is running and PORT in .env matches the server.'
        : '';
    throw new Error(
      e instanceof Error ? `Network error during upload: ${e.message}.${hint}` : `Network error during upload.${hint}`
    );
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        'Session expired or not signed in. Use Staff sign in again, then retry the upload.'
      );
    }
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  if (!data.url) {
    throw new Error('Upload succeeded but the server did not return an image URL.');
  }
  return data.url;
}

export async function uploadLessonFile(file: File): Promise<string> {
  if (!getAuthToken()) {
    throw new Error('Sign in again as staff — your session is missing, so uploads are blocked.');
  }
  const fd = new FormData();
  fd.append('file', file, file.name || 'file');

  const base = getUploadApiBase();
  const headers = authHeaders() as Record<string, string>;
  const authHeader: HeadersInit = headers.Authorization
    ? { Authorization: headers.Authorization }
    : {};

  let res: Response;
  try {
    res = await fetch(`${base}/api/upload/file`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: authHeader,
      body: fd,
    });
  } catch (e) {
    const hint =
      base.startsWith('http://127.0.0.1') || base.startsWith('http://localhost')
        ? ' Check that the API is running and PORT in .env matches the server.'
        : '';
    throw new Error(
      e instanceof Error ? `Network error during upload: ${e.message}.${hint}` : `Network error during upload.${hint}`
    );
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Session expired or not signed in. Use Staff sign in again, then retry the upload.');
    }
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  if (!data.url) {
    throw new Error('Upload succeeded but the server did not return a file URL.');
  }
  return data.url;
}

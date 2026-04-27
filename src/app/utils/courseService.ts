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
  // Validate input before sending
  if (!body.name?.trim()) {
    throw new Error('Course name is required');
  }
  
  const allowedIcons = [
    "Briefcase", "Code", "Palette", "FileText", "Sheet", "Presentation",
    "Layout", "Braces", "Database", "Globe", "Smartphone", "Camera",
    "Book", "GraduationCap", "Users", "Zap", "Settings", "Heart",
    "Star", "Lightbulb", "Puzzle", "Target", "Rocket", "Shield"
  ];
  
  if (body.icon && !allowedIcons.includes(body.icon)) {
    throw new Error('Invalid icon selection');
  }
  
  if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
    throw new Error('Invalid color format');
  }
  
  return send<Course>('/api/courses', { 
    method: 'POST', 
    body: JSON.stringify({
      name: body.name.trim(),
      description: body.description?.trim() || '',
      icon: body.icon || 'Briefcase',
      color: body.color || '#4299E1',
      order: body.order || 1,
    }) 
  });
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
  // Sanitize and validate updates
  const sanitizedUpdates: any = {};
  if (updates.name != null) {
    if (typeof updates.name !== 'string' || !updates.name.trim()) {
      throw new Error('Course name must be a non-empty string');
    }
    sanitizedUpdates.name = updates.name.trim();
  }
  if (updates.description != null) sanitizedUpdates.description = updates.description;
  if (updates.icon != null) sanitizedUpdates.icon = updates.icon;
  if (updates.color != null) sanitizedUpdates.color = updates.color;
  if (updates.image != null) sanitizedUpdates.image = updates.image;
  if (updates.order != null) sanitizedUpdates.order = updates.order;
  
  return send<Course>(`/api/courses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(sanitizedUpdates),
  });
}

export async function deleteCourse(id: string): Promise<void> {
  await send<{ ok: boolean }>(`/api/courses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createTopic(body: Omit<Topic, 'id'>): Promise<Topic> {
  const { courseId, ...rest } = body;
  
  // Validate input
  if (!rest.name?.trim()) {
    throw new Error('Topic name is required');
  }
  
  return send<Topic>(`/api/courses/${encodeURIComponent(courseId)}/topics`, {
    method: 'POST',
    body: JSON.stringify({
      ...rest,
      name: rest.name.trim(),
    }),
  });
}

export async function updateTopic(id: string, updates: Partial<Topic>): Promise<Topic> {
  // Sanitize and validate updates
  const sanitizedUpdates: any = {};
  if (updates.name != null) {
    if (typeof updates.name !== 'string' || !updates.name.trim()) {
      throw new Error('Topic name must be a non-empty string');
    }
    sanitizedUpdates.name = updates.name.trim();
  }
  if (updates.description != null) sanitizedUpdates.description = updates.description;
  if (updates.icon != null) sanitizedUpdates.icon = updates.icon;
  if (updates.color != null) sanitizedUpdates.color = updates.color;
  if (updates.image != null) sanitizedUpdates.image = updates.image;
  if (updates.order != null) sanitizedUpdates.order = updates.order;
  
  return send<Topic>(`/api/topics/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(sanitizedUpdates),
  });
}

export async function deleteTopic(id: string): Promise<void> {
  await send<{ ok: boolean }>(`/api/topics/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createLesson(body: Omit<Lesson, 'id'>): Promise<Lesson> {
  const { topicId, ...rest } = body;
  
  // Validate input
  if (!rest.title?.trim()) {
    throw new Error('Lesson title is required');
  }
  
  const allowedTypes = ['teaching', 'practice', 'project'];
  if (rest.type && !allowedTypes.includes(rest.type)) {
    throw new Error('Invalid lesson type');
  }
  
  return send<Lesson>(`/api/topics/${encodeURIComponent(topicId)}/lessons`, {
    method: 'POST',
    body: JSON.stringify({
      ...rest,
      title: rest.title.trim(),
    }),
  });
}

export async function updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson> {
  // Sanitize and validate updates
  const sanitizedUpdates: any = {};
  if (updates.title != null) {
    if (typeof updates.title !== 'string' || !updates.title.trim()) {
      throw new Error('Lesson title must be a non-empty string');
    }
    sanitizedUpdates.title = updates.title.trim();
  }
  if (updates.content != null) sanitizedUpdates.content = updates.content;
  if (updates.day != null) sanitizedUpdates.day = updates.day;
  if (updates.type != null) sanitizedUpdates.type = updates.type;
  if (updates.duration != null) sanitizedUpdates.duration = updates.duration;
  if (updates.order != null) sanitizedUpdates.order = updates.order;
  if (updates.images != null) sanitizedUpdates.images = updates.images;
  if (updates.attachments != null) sanitizedUpdates.attachments = updates.attachments;
  
  return send<Lesson>(`/api/lessons/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(sanitizedUpdates),
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

// Course-level content management
export async function addCourseAttachment(courseId: string, attachmentUrl: string): Promise<Course> {
  return send<Course>(`/api/courses/${encodeURIComponent(courseId)}/attachments`, {
    method: 'POST',
    body: JSON.stringify({ url: attachmentUrl }),
  });
}

export async function removeCourseAttachment(courseId: string, attachmentUrl: string): Promise<Course> {
  return send<Course>(`/api/courses/${encodeURIComponent(courseId)}/attachments`, {
    method: 'DELETE',
    body: JSON.stringify({ url: attachmentUrl }),
  });
}

// Topic-level content management (section/module content)
export async function addTopicAttachment(topicId: string, attachmentUrl: string): Promise<Topic> {
  return send<Topic>(`/api/topics/${encodeURIComponent(topicId)}/attachments`, {
    method: 'POST',
    body: JSON.stringify({ url: attachmentUrl }),
  });
}

export async function removeTopicAttachment(topicId: string, attachmentUrl: string): Promise<Topic> {
  return send<Topic>(`/api/topics/${encodeURIComponent(topicId)}/attachments`, {
    method: 'DELETE',
    body: JSON.stringify({ url: attachmentUrl }),
  });
}

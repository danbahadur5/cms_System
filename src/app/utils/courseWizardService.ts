import { getApiBase, authHeaders, parseJsonResponse } from './api';
import { uploadLessonImage, uploadLessonFile } from './courseService';

export interface WizardCourseData {
  name: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  order: number;
  attachments?: string[];
}

export interface WizardTopicData {
  id: string; // Temporary ID for wizard state
  name: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  order: number;
  attachments?: string[];
}

export interface WizardLessonData {
  id: string; // Temporary ID for wizard state
  topicId: string; // References WizardTopicData.id
  title: string;
  content: string;
  day: number;
  type: 'teaching' | 'practice' | 'project';
  order: number;
  images?: string[];
  attachments?: string[];
}

export interface WizardBatchPayload {
  course: WizardCourseData;
  topics: Array<{
    topic: Omit<WizardTopicData, 'id'>;
    lessons: Array<Omit<WizardLessonData, 'id' | 'topicId'>>;
  }>;
}

/**
 * Upload a complete course with topics and lessons via batch endpoint
 */
export async function uploadCourseBatch(payload: WizardBatchPayload) {
  const res = await fetch(`${getApiBase()}/api/admin/courses/batch`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

/**
 * Upload a single image and return the URL
 */
export { uploadLessonImage };

/**
 * Upload a single file and return the URL
 */
export { uploadLessonFile };

/**
 * Generate a unique temporary ID for wizard state
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

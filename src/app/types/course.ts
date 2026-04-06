export interface Course {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  courseId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  order: number;
}

export interface Lesson {
  id: string;
  topicId: string;
  day: number;
  title: string;
  content: string;
  type: 'teaching' | 'practice' | 'project';
  order: number;
  images?: string[]; // Base64 encoded images or URLs
  attachments?: string[]; // File URLs (Cloudinary raw or /uploads)
}
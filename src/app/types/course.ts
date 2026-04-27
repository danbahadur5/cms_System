export interface Course {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  order: number;
  attachments?: string[]; // Course-level attachments
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
  attachments?: string[]; // Topic-level attachments
}

export interface Lesson {
  id: string;
  topicId: string;
  day: number;
  title: string;
  content: string;
  type: 'teaching' | 'practice' | 'project';
  duration: number; // Duration in hours
  order: number;
  images?: string[]; // Base64 encoded images or URLs
  attachments?: string[]; // File URLs (Cloudinary raw or /uploads)
}

export interface Project {
  id: string;
  topicId: string;
  title: string;
  description: string;
  objectives: string[]; // Learning objectives
  requirements: string[]; // Project requirements
  duration: number; // Duration in hours
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  attachments?: string[]; // Project resources/templates
  dueDate?: string; // ISO date string
  order: number;
  createdAt: string;
}

export interface Assignment {
  id: string;
  projectId: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string; // ISO date string
  maxScore: number;
  attachments?: string[]; // Assignment templates
  order: number;
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentName: string;
  studentEmail: string;
  submissionFiles?: string[];
  submissionText: string;
  score?: number;
  feedback: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  submittedAt?: string;
  gradedAt?: string;
  createdAt: string;
}
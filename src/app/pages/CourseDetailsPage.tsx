import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { fetchCourse, fetchTopicsByCourse } from '../utils/courseService';
import type { Course, Topic } from '../types/course';
import { FolderCard } from '../components/FolderCard';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setCourse(undefined);
    Promise.all([fetchCourse(courseId), fetchTopicsByCourse(courseId)]).then(([c, t]) => {
      if (!cancelled) {
        setCourse(c);
        setTopics(t);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (course === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading…
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4">Course not found</h2>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to All Courses
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FolderOpen className="h-8 w-8" style={{ color: course.color }} />
            <h1>{course.name}</h1>
          </div>
          <p className="text-gray-600">{course.description}</p>
        </div>

        {topics.length > 0 ? (
          <div>
            <h2 className="mb-6">Topics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => (
                <FolderCard
                  key={topic.id}
                  title={topic.name}
                  description={topic.description}
                  icon={topic.icon}
                  color={topic.color}
                  to={`/courses/${courseId}/${topic.id}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">No topics available yet. Visit the admin panel to add topics to this course.</p>
          </div>
        )}
      </div>
    </div>
  );
}

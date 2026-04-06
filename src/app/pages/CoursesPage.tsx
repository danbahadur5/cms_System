import { useEffect, useState } from 'react';
import { fetchCourses } from '../utils/courseService';
import type { Course } from '../types/course';
import { FolderCard } from '../components/FolderCard';
import { BookOpen } from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h1>All Courses</h1>
          </div>
          <p className="text-gray-600">
            Select a course to explore topics and lessons. Each course is organized like a folder for easy navigation.
          </p>
        </div>

        {loading ? (
          <p className="text-center py-12 text-gray-500">Loading courses…</p>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <FolderCard
                key={course.id}
                title={course.name}
                description={course.description}
                icon={course.icon}
                color={course.color}
                to={`/courses/${course.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No courses available yet. Sign in as staff to add courses in the admin panel.</p>
          </div>
        )}
      </div>
    </div>
  );
}

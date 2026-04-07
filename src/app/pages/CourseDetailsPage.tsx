import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { fetchCourse, fetchTopicsByCourse } from "../utils/courseService";
import type { Course, Topic } from "../types/course";
import { FolderCard } from "../components/FolderCard";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "../components/ui/button";

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setCourse(undefined);
    Promise.all([fetchCourse(courseId), fetchTopicsByCourse(courseId)]).then(
      ([c, t]) => {
        if (!cancelled) {
          setCourse(c);
          setTopics(t);
        }
      },
    );
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
          <Button onClick={() => navigate("/courses")}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Courses
        </Link>

        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-6">
            {course.image ? (
              <div className="w-full md:w-48 aspect-video md:aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm shrink-0">
                <img
                  src={resolveMediaUrl(course.image)}
                  alt={course.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="h-16 w-16 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: course.color + "20",
                  color: course.color,
                }}
              >
                <FolderOpen className="h-8 w-8" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-3">{course.name}</h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                {course.description}
              </p>
            </div>
          </div>
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
                  image={topic.image}
                  to={`/courses/${courseId}/${topic.id}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">
              No topics available yet. Visit the admin panel to add topics to
              this course.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

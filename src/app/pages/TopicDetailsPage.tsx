import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { fetchCourse, fetchTopic, fetchLessonsByTopic } from '../utils/courseService';
import type { Course, Topic, Lesson } from '../types/course';
import { ArrowLeft, FileText, BookOpen, Lightbulb, Hammer } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LessonVisualModules } from '../components/LessonVisualModules';
import { resolveMediaUrl } from '../utils/api';
import { Paperclip } from 'lucide-react';

export default function TopicDetailsPage() {
  const { courseId, topicId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [topic, setTopic] = useState<Topic | null | undefined>(undefined);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    if (!courseId || !topicId) return;
    let cancelled = false;
    setCourse(undefined);
    setTopic(undefined);
    Promise.all([fetchCourse(courseId), fetchTopic(topicId), fetchLessonsByTopic(topicId)]).then(
      ([c, t, ls]) => {
        if (!cancelled) {
          setCourse(c);
          setTopic(t);
          setLessons(ls);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [courseId, topicId]);

  if (course === undefined || topic === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Loading…
      </div>
    );
  }

  if (!course || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4">Topic not found</h2>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </div>
    );
  }

  const lessonsByDay = lessons.reduce(
    (acc, lesson) => {
      if (!acc[lesson.day]) acc[lesson.day] = [];
      acc[lesson.day].push(lesson);
      return acc;
    },
    {} as Record<number, Lesson[]>
  );

  const days = Object.keys(lessonsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'teaching':
        return <BookOpen className="h-5 w-5" />;
      case 'practice':
        return <Lightbulb className="h-5 w-5" />;
      case 'project':
        return <Hammer className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'teaching':
        return 'bg-blue-100 text-blue-700';
      case 'practice':
        return 'bg-yellow-100 text-yellow-700';
      case 'project':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/courses" className="hover:text-blue-600">
            All Courses
          </Link>
          <span>/</span>
          <Link to={`/courses/${courseId}`} className="hover:text-blue-600">
            {course.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{topic.name}</span>
        </div>

        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-6">
            {topic.image ? (
              <div className="w-full md:w-48 aspect-video md:aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm shrink-0">
                <img
                  src={resolveMediaUrl(topic.image)}
                  alt={topic.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="h-16 w-16 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: topic.color + '20', color: topic.color }}
              >
                <FileText className="h-8 w-8" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-2">{topic.name}</h1>
              <p className="text-gray-600 text-lg leading-relaxed">{topic.description}</p>
            </div>
          </div>
        </div>

        {days.length > 0 ? (
          <div className="space-y-8">
            {days.map((day) => (
              <div key={day}>
                <h2 className="mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    {day}
                  </span>
                  Day {day}
                </h2>
                <div className="space-y-4">
                  {lessonsByDay[day].map((lesson) => (
                    <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${getTypeColor(lesson.type)}`}>
                              {getTypeIcon(lesson.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-lg">{lesson.title}</CardTitle>
                                </div>
                                {lesson.images && lesson.images.length > 0 && (
                                  <div className="shrink-0">
                                    <img
                                      src={resolveMediaUrl(lesson.images[0])}
                                      alt=""
                                      className="h-12 w-16 rounded-md border border-gray-200 bg-gray-100 object-cover"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </div>
                                )}
                              </div>
                              <CardDescription className="mt-2 text-base text-gray-600">
                                {lesson.content}
                              </CardDescription>

                              {lesson.images && lesson.images.length > 0 && (
                                <LessonVisualModules
                                  lessonTitle={lesson.title}
                                  lessonType={lesson.type}
                                  images={lesson.images}
                                />
                              )}

                              {lesson.attachments && lesson.attachments.length > 0 && (
                                <div className="mt-4 rounded-xl border border-slate-200/80 bg-white/70 p-3">
                                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                    <Paperclip className="h-4 w-4 opacity-80" aria-hidden />
                                    <span>Files</span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {lesson.attachments.map((u, idx) => (
                                      <li key={`${u}-${idx}`} className="text-sm">
                                        <a
                                          className="text-blue-700 hover:underline"
                                          href={resolveMediaUrl(u)}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          Download file {idx + 1}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge className={getTypeColor(lesson.type)}>
                            {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">No lessons available yet. Visit the admin panel to add lessons to this topic.</p>
          </div>
        )}

        <div className="mt-8">
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {course.name}
          </Button>
        </div>
      </div>
    </div>
  );
}

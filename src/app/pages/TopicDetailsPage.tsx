import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { fetchCourse, fetchTopic, fetchLessonsByTopic } from '../utils/courseService';
import type { Course, Topic, Lesson } from '../types/course';
import { ArrowLeft, FileText, BookOpen, Lightbulb, Hammer, Download, Folder } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LessonVisualModules } from '../components/LessonVisualModules';
import { DayWiseLessonCard } from '../components/DayWiseLessonCard';
import { resolveMediaUrl } from '../utils/api';
import { Paperclip } from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export default function TopicDetailsPage() {
  const { courseId, topicId } = useParams();
  const navigate = useNavigate();
  const { adminEmail } = useAdminAuth();
  const isAdmin = !!adminEmail;
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

        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100 overflow-hidden content-protected" onContextMenu={(e) => e.preventDefault()}>
          <div className="flex flex-col md:flex-row gap-6">
            {topic.image ? (
              <div className="w-full md:w-48 aspect-video md:aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm shrink-0">
                <img
                  src={resolveMediaUrl(topic.image)}
                  alt={topic.name}
                  className="w-full h-full object-cover protected-allow-view"
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
              <p className="text-gray-600 text-lg leading-relaxed mb-4">{topic.description}</p>
              {lessons.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900">{lessons.length}</span>
                    <span>lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900">{days.length}</span>
                    <span>days</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section/Topic Level Attachments */}
        {(topic.attachments || []).length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-300 rounded-lg p-6 content-protected" onContextMenu={(e) => e.preventDefault()}>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg shrink-0">
                <Folder className="h-6 w-6 text-green-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  📚 Section Materials & Resources
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(topic.attachments || []).map((url, idx) => {
                    const displayName = url.split('/').filter(Boolean).at(-1) || `Material ${idx + 1}`;
                    return isAdmin ? (
                      <a
                        key={`${url}-${idx}`}
                        href={resolveMediaUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-3 bg-white rounded-md border border-green-200 hover:border-green-400 hover:bg-green-50 transition-colors group"
                      >
                        <Download className="h-5 w-5 text-green-600 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-green-700 font-medium truncate flex-1">
                          {displayName.replace(/^lesson-|^topic-/, '').substring(0, 40)}
                        </span>
                        <span className="text-xs text-green-600 shrink-0">↓</span>
                      </a>
                    ) : (
                      <div
                        key={`${url}-${idx}`}
                        className="flex items-center gap-2 p-3 bg-white rounded-md border border-gray-200"
                      >
                        <FileText className="h-5 w-5 text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-600 font-medium truncate flex-1">
                          Resource {idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {days.length > 0 ? (
          <div className="space-y-12">
            {days.map((day, dayIndex) => (
              <section key={day} className="scroll-mt-4" id={`day-${day}`}>
                {/* Day Header */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-lg shadow-sm border-2 border-blue-200">
                      {day}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Day {day}</h2>
                      <p className="text-sm text-gray-600">{lessonsByDay[day].length} lesson{lessonsByDay[day].length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {dayIndex < days.length - 1 && (
                    <div className="flex-1 h-1 bg-gradient-to-r from-blue-200 to-transparent rounded-full"></div>
                  )}
                </div>

                {/* Lessons for this day */}
                <div className="space-y-4">
                  {lessonsByDay[day]
                    .sort((a, b) => a.order - b.order)
                    .map((lesson, lessonIndex) => (
                    <Card key={lesson.id} className="hover:shadow-lg transition-all duration-200 overflow-hidden border-l-4 content-protected" style={{ borderLeftColor: lesson.type === 'teaching' ? '#93C5FD' : lesson.type === 'practice' ? '#FCD34D' : '#6EE7B7' }} onContextMenu={(e) => e.preventDefault()}>
                      <CardHeader>
                        <div className="space-y-4">
                          {/* Lesson Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`p-3 rounded-lg flex-shrink-0 ${
                                lesson.type === 'teaching' 
                                  ? 'bg-blue-100' 
                                  : lesson.type === 'practice' 
                                    ? 'bg-amber-100' 
                                    : 'bg-green-100'
                              }`}>
                                {getTypeIcon(lesson.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <CardTitle className="text-lg text-gray-900">
                                      {lessonIndex + 1}. {lesson.title}
                                    </CardTitle>
                                    <Badge className={`mt-2 ${getTypeColor(lesson.type)}`}>
                                      {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
                                    </Badge>
                                  </div>
                                  {lesson.images && lesson.images.length > 0 && (
                                    <div className="shrink-0">
                                      <img
                                        src={resolveMediaUrl(lesson.images[0])}
                                        alt=""
                                        className="h-16 w-20 rounded-md border border-gray-200 bg-gray-100 object-cover shadow-sm hover:shadow-md transition-shadow protected-allow-view"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lesson Content */}
                          {lesson.content && (
                            <div className="pl-16 border-t pt-4">
                              <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {lesson.content.substring(0, 300)}
                                {lesson.content.length > 300 && '...'}
                              </p>
                            </div>
                          )}

                          {/* Lesson Images/Visual Modules */}
                          {lesson.images && lesson.images.length > 0 && (
                            <div className="pl-16">
                              <LessonVisualModules
                                lessonTitle={lesson.title}
                                lessonType={lesson.type}
                                images={lesson.images}
                              />
                            </div>
                          )}

                          {/* Lesson Attachments */}
                          {lesson.attachments && lesson.attachments.length > 0 && (
                            <div className="pl-16">
                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 content-protected" onContextMenu={(e) => e.preventDefault()}>
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <Paperclip className="h-4 w-4" />
                                  <span>Lesson Resources ({lesson.attachments.length})</span>
                                </div>
                                <ul className="space-y-2">
                                  {lesson.attachments.map((u, idx) => {
                                    const displayName = u.split('/').filter(Boolean).at(-1) || `Resource ${idx + 1}`;
                                    return isAdmin ? (
                                      <li key={`${u}-${idx}`} className="text-sm">
                                        <a
                                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                                          href={resolveMediaUrl(u)}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <Download className="h-4 w-4" />
                                          <span>{displayName.replace(/^lesson-|^topic-/, '').substring(0, 40)}</span>
                                        </a>
                                      </li>
                                    ) : (
                                      <li key={`${u}-${idx}`} className="text-sm">
                                        <div className="inline-flex items-center gap-2 text-gray-500 font-medium">
                                          <FileText className="h-4 w-4" />
                                          <span>{displayName.replace(/^lesson-|^topic-/, '').substring(0, 40)} (View only)</span>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No lessons available yet</p>
            <p className="text-gray-400 text-sm mt-1">Visit the admin panel to add lessons to this topic</p>
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

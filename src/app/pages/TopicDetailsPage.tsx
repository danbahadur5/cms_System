import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  fetchCourse,
  fetchTopic,
  fetchLessonsByTopic,
} from "../utils/courseService";
import type { Course, Topic, Lesson } from "../types/course";
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Lightbulb,
  Hammer,
  Download,
  Folder,
  ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { LessonVisualModules } from "../components/LessonVisualModules";
import { sanitizeHtml } from "../utils/editorUtils";
import { resolveMediaUrl } from "../utils/api";
import { Paperclip } from "lucide-react";
import { useAdminAuth } from "../contexts/AdminAuthContext";

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
    Promise.all([
      fetchCourse(courseId),
      fetchTopic(topicId),
      fetchLessonsByTopic(topicId),
    ]).then(([c, t, ls]) => {
      if (!cancelled) {
        setCourse(c);
        setTopic(t);
        setLessons(ls);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, topicId]);

  if (course === undefined || topic === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!course || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-10 rounded-2xl shadow-sm border max-w-md">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Topic not found</h2>
          <p className="text-gray-500 text-sm mb-6">
            This topic may have been removed or doesn't exist.
          </p>
          <Button onClick={() => navigate("/courses")}>Back to Courses</Button>
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
    {} as Record<number, Lesson[]>,
  );

  const days = Object.keys(lessonsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  const getTypeIcon = (type: string, className = "h-5 w-5") => {
    switch (type) {
      case "teaching":
        return <BookOpen className={className} />;
      case "practice":
        return <Lightbulb className={className} />;
      case "project":
        return <Hammer className={className} />;
      default:
        return <FileText className={className} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "teaching":
        return "bg-blue-100 text-blue-700";
      case "practice":
        return "bg-yellow-100 text-yellow-700";
      case "project":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center h-14 gap-1.5 text-sm text-gray-500">
            <Link to="/courses" className="hover:text-blue-600 transition-colors shrink-0">
              All Courses
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <Link to={`/courses/${courseId}`} className="hover:text-blue-600 transition-colors truncate shrink-0 max-w-[200px]">
              {course.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <span className="text-gray-800 font-medium truncate">{topic.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Hero Section */}
        <div className="relative mb-10 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {topic.image && (
            <div className="absolute inset-0">
              <img
                src={resolveMediaUrl(topic.image)}
                alt=""
                className="w-full h-full object-cover opacity-10"
              />
            </div>
          )}
          <div className="relative p-8 md:p-10">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {topic.image ? (
                <div className="w-full md:w-56 aspect-video md:aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-md shrink-0">
                  <img
                    src={resolveMediaUrl(topic.image)}
                    alt={topic.name}
                    className="w-full h-full object-cover protected-allow-view"
                  />
                </div>
              ) : (
                <div
                  className="h-24 w-24 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                  style={{
                    backgroundColor: topic.color + "18",
                    color: topic.color,
                  }}
                >
                  <FileText className="h-12 w-12" />
                </div>
              )}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    {topic.name}
                  </h1>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-6 max-w-2xl">
                  {topic.description}
                </p>
                {lessons.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-lg text-sm">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="font-semibold">{lessons.length}</span>
                      <span className="text-gray-500">lesson{lessons.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-lg text-sm">
                      <span className="font-semibold">{days.length}</span>
                      <span className="text-gray-500">day{days.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section/Topic Level Attachments */}
        {(topic.attachments || []).length > 0 && (
          <div className="mb-10 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Folder className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Section Materials & Resources</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(topic.attachments || []).map((url, idx) => {
                  const displayName =
                    url.split("/").filter(Boolean).at(-1) ||
                    `Material ${idx + 1}`;
                  return isAdmin ? (
                    <a
                      key={`${url}-${idx}`}
                      href={resolveMediaUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm hover:bg-gray-50 transition-all group"
                    >
                      <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                        <Download className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="text-sm text-gray-700 font-medium truncate flex-1">
                        {displayName
                          .replace(/^lesson-|^topic-/, "")
                          .substring(0, 40)}
                      </span>
                    </a>
                  ) : (
                    <div
                      key={`${url}-${idx}`}
                      className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                      <span className="text-sm text-gray-600 font-medium truncate flex-1">
                        Resource {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Day Sections */}
        {days.length > 0 ? (
          <div>
            <div className="space-y-10">
              {days.map((day, dayIndex) => (
                <section key={day} className="relative scroll-mt-20" id={`day-${day}`}>
                  {/* Day Header */}
                  <div className="flex items-center gap-5 mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-gray-700 font-bold text-lg shrink-0 relative z-10">
                      {day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900">
                        Day {day}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {lessonsByDay[day].length} lesson
                        {lessonsByDay[day].length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {dayIndex < days.length - 1 && (
                      <div className="hidden md:block flex-1 max-w-[200px] h-px bg-gray-100" />
                    )}
                  </div>

                  {/* Lessons for this day */}
                  <div className="space-y-5 md:ml-16">
                    {lessonsByDay[day]
                      .sort((a, b) => a.order - b.order)
                      .map((lesson, lessonIndex) => {
                      const contentHtml = lesson.content
                        ? sanitizeHtml(lesson.content)
                        : "";
                      const h1Match = contentHtml.match(
                        /<h1[^>]*>([\s\S]*?)<\/h1>/i,
                      );
                      const contentBody = (h1Match
                        ? contentHtml.replace(h1Match[0], "")
                        : contentHtml
                      ).replace(/\/(?![^<]*>)/g, "<br />");

                        return (
                          <Card
                            key={lesson.id}
                            id={`lesson-${lesson.id}`}
                            className="hover:shadow-md transition-shadow overflow-hidden content-protected border-l-[5px]"
                            style={{
                              borderLeftColor:
                                lesson.type === "teaching"
                                  ? "#93C5FD"
                                  : lesson.type === "practice"
                                    ? "#FCD34D"
                                    : "#6EE7B7",
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            <CardHeader className="p-4 md:p-6">
                              <div className="space-y-4 md:space-y-5">
                                {/* Lesson Header */}
                                <div className="flex items-start justify-between gap-3 md:gap-5">
                                  <div className="flex items-start gap-3 md:gap-5 flex-1 min-w-0">
                                    <div
                                      className={`p-3 rounded-xl flex-shrink-0 ${
                                        lesson.type === "teaching"
                                          ? "bg-blue-100 text-blue-600"
                                          : lesson.type === "practice"
                                            ? "bg-amber-100 text-amber-600"
                                            : "bg-green-100 text-green-600"
                                      }`}
                                    >
                                      {getTypeIcon(lesson.type, "h-4 w-4 md:h-5 md:w-5")}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <CardTitle className="text-base md:text-xl text-gray-900 font-bold">
                                            {lessonIndex + 1}. {lesson.title}
                                          </CardTitle>
                                          <div className="flex items-center gap-2 mt-2 md:mt-3">
                                            <Badge
                                              className={getTypeColor(lesson.type)}
                                            >
                                              {lesson.type.charAt(0).toUpperCase() +
                                                lesson.type.slice(1)}
                                            </Badge>
                                            {lesson.duration && (
                                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                                ~{lesson.duration}h
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {lesson.images &&
                                          lesson.images.length > 0 && (
                                            <div className="shrink-0 hidden sm:block">
                                              <img
                                                src={resolveMediaUrl(
                                                  lesson.images[0],
                                                )}
                                                alt=""
                                                className="h-16 w-20 md:h-20 md:w-28 rounded-lg border border-gray-200 bg-gray-100 object-cover shadow-sm protected-allow-view"
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
                                <div className="pl-0 md:pl-[4.25rem] border-t pt-5">
                                  <div
                                    className="lesson-content text-[15px] text-gray-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                      __html: contentBody,
                                    }}
                                  />
                                </div>
                              )}

                                {/* Lesson Images/Visual Modules */}
                                {lesson.images && lesson.images.length > 0 && (
                                  <div className="pl-0 md:pl-[4.25rem]">
                                    <LessonVisualModules
                                      lessonTitle={lesson.title}
                                      lessonType={lesson.type}
                                      images={lesson.images}
                                    />
                                  </div>
                                )}

                                {/* Lesson Attachments */}
                                {lesson.attachments &&
                                  lesson.attachments.length > 0 && (
                                    <div className="pl-0 md:pl-[4.25rem]">
                                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 content-protected"
                                        onContextMenu={(e) => e.preventDefault()}
                                      >
                                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                          <Paperclip className="h-4 w-4" />
                                          <span>
                                            Resources ({lesson.attachments.length})
                                          </span>
                                        </div>
                                        <ul className="space-y-2">
                                          {lesson.attachments.map((u, idx) => {
                                            const displayName =
                                              u
                                                .split("/")
                                                .filter(Boolean)
                                                .at(-1) || `Resource ${idx + 1}`;
                                            return isAdmin ? (
                                              <li
                                                key={`${u}-${idx}`}
                                                className="text-sm"
                                              >
                                                <a
                                                  className="inline-flex items-center gap-2.5 text-blue-600 hover:text-blue-700 font-medium transition-colors group"
                                                  href={resolveMediaUrl(u)}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                >
                                                  <span className="p-1 rounded bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                                    <Download className="h-3.5 w-3.5" />
                                                  </span>
                                                  <span className="hover:underline">
                                                    {displayName
                                                      .replace(
                                                        /^lesson-|^topic-/,
                                                        "",
                                                      )
                                                      .substring(0, 40)}
                                                  </span>
                                                </a>
                                              </li>
                                            ) : (
                                              <li
                                                key={`${u}-${idx}`}
                                                className="text-sm"
                                              >
                                                <div className="inline-flex items-center gap-2.5 text-gray-500 font-medium">
                                                  <span className="p-1 rounded bg-gray-100">
                                                    <FileText className="h-3.5 w-3.5" />
                                                  </span>
                                                  <span>
                                                    {displayName
                                                      .replace(
                                                        /^lesson-|^topic-/,
                                                        "",
                                                      )
                                                      .substring(0, 40) +
                                                      " (View only)"}
                                                  </span>
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
                        );
                      })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-24 px-6 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-lg font-semibold mb-1.5">No lessons available yet</p>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Lessons will appear here once an admin adds them to this topic.
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="mt-12 mb-8 border-t border-gray-200 pt-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {course.name}
          </Button>
        </div>
      </div>
    </div>
  );
}

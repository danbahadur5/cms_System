import React from "react";
import {
  BookOpen,
  Lightbulb,
  Hammer,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import type { Lesson } from "../types/course";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { resolveMediaUrl } from "../utils/api";
import { sanitizeHtml } from "../utils/editorUtils";
import { useAdminAuth } from "../contexts/AdminAuthContext";

interface DayWiseLessonCardProps {
  lesson: Lesson;
  lessonNumber: number;
  expanded?: boolean;
  onToggle?: () => void;
}

export function DayWiseLessonCard({
  lesson,
  lessonNumber,
  expanded = false,
  onToggle,
}: DayWiseLessonCardProps) {
  const { adminEmail } = useAdminAuth();
  const isAdmin = !!adminEmail;
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "teaching":
        return <BookOpen className="h-5 w-5" />;
      case "practice":
        return <Lightbulb className="h-5 w-5" />;
      case "project":
        return <Hammer className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "teaching":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          badge: "bg-blue-100 text-blue-700",
          icon: "text-blue-600",
        };
      case "practice":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          badge: "bg-amber-100 text-amber-700",
          icon: "text-amber-600",
        };
      case "project":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          badge: "bg-green-100 text-green-700",
          icon: "text-green-600",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          badge: "bg-gray-100 text-gray-700",
          icon: "text-gray-600",
        };
    }
  };

  const colors = getTypeColor(lesson.type);
  const typeLabel = lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1);

  // Prepare content heading and body for cleaner rendering
  const contentHtml = lesson.content ? sanitizeHtml(lesson.content) : "";
  const h1Match = contentHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const contentBody = (h1Match
    ? contentHtml.replace(h1Match[0], "")
    : contentHtml
  ).replace(/\/(?![^<]*>)/g, "<br />");

  return (
    <Card
      className={`${colors.bg} border-2 ${colors.border} hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden content-protected`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <CardHeader className="p-5" onClick={onToggle}>
        <div className="flex items-start justify-between gap-5">
          {/* Left: Number and Title */}
          <div className="flex items-start gap-4 flex-1">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-xl font-bold text-white text-lg shrink-0 ${
                lesson.type === "teaching"
                  ? "bg-blue-600"
                  : lesson.type === "practice"
                    ? "bg-amber-600"
                    : "bg-green-600"
              }`}
            >
              {lessonNumber}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <CardTitle className="text-lg font-bold text-gray-900">
                {lesson.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <Badge className={colors.badge}>{typeLabel}</Badge>
                {lesson.duration && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 bg-white/50 px-2.5 py-1 rounded-md border border-gray-200">
                    <Clock className="h-3 w-3" />
                    <span>{lesson.duration}h</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Image Thumbnail & Expand Button */}
          <div className="flex items-start gap-3 shrink-0">
            {lesson.images && lesson.images.length > 0 && (
              <img
                src={resolveMediaUrl(lesson.images[0])}
                alt={lesson.title}
                className="h-14 w-14 rounded-lg object-cover border border-gray-300 shadow-sm protected-allow-view"
              />
            )}
            {onToggle && (
              <button className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors">
                {expanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-current border-opacity-20 space-y-5">
          {/* Content Preview */}
          {lesson.content && (
            <div className="bg-white/60 rounded-xl p-4 border border-current border-opacity-10">
              <div
                className="lesson-content text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: contentBody }}
              />
            </div>
          )}

          {/* Files/Attachments */}
          {lesson.attachments && lesson.attachments.length > 0 && (
            <div className="bg-white/60 rounded-xl p-4 border border-current border-opacity-10">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                <Download className="h-4 w-4" />
                Resources ({lesson.attachments.length})
              </div>
              <ul className="space-y-1.5">
                {lesson.attachments.map((url, idx) => (
                  <li key={`${url}-${idx}`}>
                    {isAdmin ? (
                      <a
                        href={resolveMediaUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        ↓ Download {idx + 1}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Resource {idx + 1} (View only)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Images Gallery */}
          {lesson.images && lesson.images.length > 1 && (
            <div className="bg-white/60 rounded-xl p-4 border border-current border-opacity-10">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Learning Materials
              </p>
              <div className="flex gap-3 overflow-x-auto">
                {lesson.images.map((img, idx) =>
                  isAdmin ? (
                    <a
                      key={`${img}-${idx}`}
                      href={resolveMediaUrl(img)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0"
                    >
                      <img
                        src={resolveMediaUrl(img)}
                        alt={`${lesson.title} ${idx + 1}`}
                        className="h-20 w-24 rounded-lg object-cover border border-gray-300 hover:shadow-md transition-shadow protected-allow-view"
                      />
                    </a>
                  ) : (
                    <div key={`${img}-${idx}`} className="flex-shrink-0">
                      <img
                        src={resolveMediaUrl(img)}
                        alt={`${lesson.title} ${idx + 1}`}
                        className="h-20 w-24 rounded-lg object-cover border border-gray-300 protected-allow-view"
                      />
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

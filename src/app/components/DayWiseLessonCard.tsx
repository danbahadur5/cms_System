import React from 'react';
import { BookOpen, Lightbulb, Hammer, Clock, Download, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { Lesson } from '../types/course';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { resolveMediaUrl } from '../utils/api';
import { useAdminAuth } from '../contexts/AdminAuthContext';

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
      case 'teaching':
        return <BookOpen className="h-5 w-5" />;
      case 'practice':
        return <Lightbulb className="h-5 w-5" />;
      case 'project':
        return <Hammer className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'teaching':
        return { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: 'text-blue-600' };
      case 'practice':
        return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-600' };
      case 'project':
        return { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: 'text-green-600' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700', icon: 'text-gray-600' };
    }
  };

  const colors = getTypeColor(lesson.type);
  const typeLabel = lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1);

  return (
    <Card className={`${colors.bg} border-2 ${colors.border} hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden content-protected`} onContextMenu={(e) => e.preventDefault()}>
      <CardHeader className="p-4" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: Number and Title */}
          <div className="flex items-start gap-4 flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-white shrink-0 ${
              lesson.type === 'teaching' ? 'bg-blue-600' :
              lesson.type === 'practice' ? 'bg-amber-600' :
              'bg-green-600'
            }`}>
              {lessonNumber}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-bold text-gray-900">
                {lesson.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={colors.badge}>
                  {typeLabel}
                </Badge>
                {lesson.duration && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 bg-white/50 px-2 py-1 rounded-md border border-gray-200">
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
                className="h-12 w-12 rounded-md object-cover border border-gray-300 shadow-sm protected-allow-view"
              />
            )}
            {onToggle && (
              <button className="p-1 text-gray-500 hover:text-gray-700 transition-colors">
                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-current border-opacity-20 space-y-4">
          {/* Content Preview */}
          {lesson.content && (
            <div className="bg-white/50 rounded-lg p-3 border border-current border-opacity-10">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">
                {lesson.content}
              </p>
            </div>
          )}

          {/* Files/Attachments */}
          {lesson.attachments && lesson.attachments.length > 0 && (
            <div className="bg-white/50 rounded-lg p-3 border border-current border-opacity-10">
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
                <Download className="h-4 w-4" />
                Resources ({lesson.attachments.length})
              </div>
              <ul className="space-y-1">
                {lesson.attachments.map((url, idx) => (
                  <li key={`${url}-${idx}`}>
                    {isAdmin ? (
                      <a
                        href={resolveMediaUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ↓ Download {idx + 1}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500">
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
            <div className="bg-white/50 rounded-lg p-3 border border-current border-opacity-10">
              <p className="text-xs font-semibold text-gray-700 mb-2">Learning Materials</p>
              <div className="flex gap-2 overflow-x-auto">
                {lesson.images.map((img, idx) => (
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
                        className="h-16 w-20 rounded object-cover border border-gray-300 hover:shadow-md transition-shadow protected-allow-view"
                      />
                    </a>
                  ) : (
                    <div
                      key={`${img}-${idx}`}
                      className="flex-shrink-0"
                    >
                      <img
                        src={resolveMediaUrl(img)}
                        alt={`${lesson.title} ${idx + 1}`}
                        className="h-16 w-20 rounded object-cover border border-gray-300 protected-allow-view"
                      />
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

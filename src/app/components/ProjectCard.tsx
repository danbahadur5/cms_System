import React, { useState } from 'react';
import { BookMarked, Star, Clock, Download, ChevronDown, ChevronUp, Target, CheckCircle2 } from 'lucide-react';
import type { Project } from '../types/course';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { resolveMediaUrl } from '../utils/api';
import { Button } from './ui/button';

interface ProjectCardProps {
  project: Project;
  expanded?: boolean;
  onToggle?: () => void;
  onStartProject?: () => void;
}

export function ProjectCard({
  project,
  expanded = false,
  onToggle,
  onStartProject,
}: ProjectCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return { badge: 'bg-green-100 text-green-700', indicator: '⭐' };
      case 'intermediate':
        return { badge: 'bg-amber-100 text-amber-700', indicator: '⭐⭐' };
      case 'advanced':
        return { badge: 'bg-red-100 text-red-700', indicator: '⭐⭐⭐' };
      default:
        return { badge: 'bg-gray-100 text-gray-700', indicator: '⭐' };
    }
  };

  const difficulty = getDifficultyColor(project.difficulty);
  const daysUntilDue = project.dueDate
    ? Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-all duration-200 overflow-hidden">
      <CardHeader className="p-4" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon and Title */}
          <div className="flex items-start gap-4 flex-1">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-lg shrink-0">
              <BookMarked className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-bold text-gray-900">
                {project.title}
              </CardTitle>
              {project.description && (
                <CardDescription className="text-sm text-gray-600 mt-1 line-clamp-1">
                  {project.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={difficulty.badge}>
                  {difficulty.indicator} {project.difficulty}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-gray-600 bg-white/70 px-2 py-1 rounded-md border border-purple-200">
                  <Clock className="h-3 w-3" />
                  <span>{project.duration}h</span>
                </div>
                {daysUntilDue !== null && (
                  <div className={`text-xs px-2 py-1 rounded-md border ${
                    isOverdue
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : daysUntilDue <= 3
                        ? 'bg-orange-100 text-orange-700 border-orange-200'
                        : 'bg-green-100 text-green-700 border-green-200'
                  }`}>
                    {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Expand Button */}
          {onToggle && (
            <button className="p-1 text-purple-600 hover:text-purple-700 transition-colors shrink-0">
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          )}
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-purple-200 space-y-4">
          {/* Objectives */}
          {project.objectives && project.objectives.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-900">
                <Target className="h-4 w-4 text-purple-600" />
                Learning Objectives
              </div>
              <ul className="space-y-1">
                {project.objectives.map((objective, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {project.requirements && project.requirements.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-900">
                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                Requirements
              </div>
              <ul className="space-y-1">
                {project.requirements.map((requirement, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Attachments */}
          {project.attachments && project.attachments.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-900">
                <Download className="h-4 w-4 text-purple-600" />
                Resources ({project.attachments.length})
              </div>
              <ul className="space-y-1">
                {project.attachments.map((url, idx) => (
                  <li key={`${url}-${idx}`}>
                    <a
                      href={resolveMediaUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download Resource {idx + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Start Project Button */}
          {onStartProject && (
            <Button
              onClick={onStartProject}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
            >
              Start Project & View Assignments
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

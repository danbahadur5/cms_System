import React, { useState } from 'react';
import { FileCheck, Upload, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { Assignment } from '../types/course';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { resolveMediaUrl } from '../utils/api';

interface AssignmentCardProps {
  assignment: Assignment;
  submitted?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onSubmit?: (files: File[], text: string) => Promise<void>;
}

export function AssignmentCard({
  assignment,
  submitted = false,
  expanded = false,
  onToggle,
  onSubmit,
}: AssignmentCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const daysUntilDue = Math.ceil(
    (new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0;

  const handleSubmit = async () => {
    if (!onSubmit) return;
    if (!submissionText.trim() && selectedFiles.length === 0) {
      alert('Please provide either a text submission or upload files');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(selectedFiles, submissionText);
      setSubmissionText('');
      setSelectedFiles([]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={`border-2 transition-all duration-200 overflow-hidden ${
      submitted
        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'
        : isOverdue
          ? 'border-red-200 bg-gradient-to-br from-red-50 to-pink-50'
          : isDueSoon
            ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50'
            : 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50'
    }`}>
      <CardHeader className="p-4" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon and Title */}
          <div className="flex items-start gap-4 flex-1">
            <div className={`flex items-center justify-center w-12 h-12 rounded-lg text-white font-bold shrink-0 ${
              submitted ? 'bg-green-600' : isOverdue ? 'bg-red-600' : isDueSoon ? 'bg-orange-600' : 'bg-blue-600'
            }`}>
              <FileCheck className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-bold text-gray-900">
                {assignment.title}
              </CardTitle>
              {assignment.description && (
                <CardDescription className="text-sm text-gray-600 mt-1 line-clamp-1">
                  {assignment.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {submitted ? (
                  <Badge className="bg-green-100 text-green-700">✓ Submitted</Badge>
                ) : isOverdue ? (
                  <Badge className="bg-red-100 text-red-700">⚠ Overdue</Badge>
                ) : isDueSoon ? (
                  <Badge className="bg-orange-100 text-orange-700">⏰ Due Soon</Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700">Pending</Badge>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-600 bg-white/50 px-2 py-1 rounded-md border">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(assignment.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-gray-600 bg-white/50 px-2 py-1 rounded-md border">
                  Score: {assignment.maxScore}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t space-y-4">
          {/* Instructions */}
          {assignment.instructions && (
            <div className="bg-white/60 rounded-lg p-4 border">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">📋 Instructions</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </div>
          )}

          {/* Attachment Templates */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="bg-white/60 rounded-lg p-4 border">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">📎 Templates & Resources</h4>
              <div className="space-y-2">
                {assignment.attachments.map((url, idx) => (
                  <a
                    key={`${url}-${idx}`}
                    href={resolveMediaUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline p-2 bg-white rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Template {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Warning */}
          {isOverdue && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <strong>Overdue!</strong> This assignment was due {Math.abs(daysUntilDue)} days ago. Late submissions may be penalized.
              </div>
            </div>
          )}

          {isDueSoon && !submitted && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 flex items-start gap-2">
              <Clock className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-700">
                <strong>Due Soon!</strong> This assignment is due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}. Submit soon to avoid penalties.
              </div>
            </div>
          )}

          {submitted && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-700">
                <strong>Submitted!</strong> Your assignment has been submitted successfully.
              </div>
            </div>
          )}

          {/* Submission Form */}
          {!submitted && !isOverdue && (
            <div className="bg-white/60 rounded-lg p-4 border space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">📤 Submit Your Work</h4>

              {/* Text Area */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  Your Submission (Optional)
                </label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="You can write your submission text here or upload files below..."
                  className="w-full h-24 p-3 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={submitting}
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">
                  Upload Files (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    className="text-sm text-gray-600 file:px-3 file:py-1.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    disabled={submitting}
                  />
                  {selectedFiles.length > 0 && (
                    <span className="text-xs text-gray-600 bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || (!submissionText.trim() && selectedFiles.length === 0)}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Assignment'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

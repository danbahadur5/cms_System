import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadLessonFile, updateLesson } from '../utils/courseService';
import { resolveMediaUrl } from '../utils/api';
import { Button } from './ui/button';
import { cn } from './ui/utils';

type PendingFile = { id: string; name: string; file: File };

export type LessonAttachmentsFieldProps = {
  attachments: string[];
  onAttachmentsChange: Dispatch<SetStateAction<string[]>>;
  persistLessonId?: string | null;
  onAfterServerSync?: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
};

function displayNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).at(-1);
    return last || url;
  } catch {
    const last = url.split('/').filter(Boolean).at(-1);
    return last || url;
  }
}

export function LessonAttachmentsField({
  attachments,
  onAttachmentsChange,
  persistLessonId,
  onAfterServerSync,
  onBusyChange,
  disabled = false,
}: LessonAttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const pendingCleanupRef = useRef<PendingFile[]>([]);
  pendingCleanupRef.current = pending;

  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    onBusyChange?.(pending.length > 0);
  }, [pending.length, onBusyChange]);

  const uploadChainRef = useRef(Promise.resolve());

  const persist = useCallback(
    async (next: string[]) => {
      if (!persistLessonId) return;
      await updateLesson(persistLessonId, { attachments: next });
    },
    [persistLessonId]
  );

  const processPending = useCallback(
    async (jobs: PendingFile[]) => {
      const errors: string[] = [];
      let ok = 0;
      for (const job of jobs) {
        try {
          const url = await uploadLessonFile(job.file);
          setPending((prev) => prev.filter((p) => p.id !== job.id));

          const next = [...attachmentsRef.current, url];
          attachmentsRef.current = next;
          onAttachmentsChange(next);
          if (persistLessonId) await persist(next);
          ok += 1;
        } catch (e) {
          setPending((prev) => prev.filter((p) => p.id !== job.id));
          errors.push(`${job.name}: ${e instanceof Error ? e.message : 'failed'}`);
        }
      }
      if (ok) {
        toast.success(`${ok} file${ok !== 1 ? 's' : ''} uploaded${persistLessonId ? ' and saved' : ''}.`);
        if (persistLessonId) await onAfterServerSync?.();
      }
      if (errors.length) {
        const lines = errors.slice(0, 3).join(' · ');
        toast.error(errors.length > 3 ? `${lines} · …` : `Upload failed: ${lines}`);
      }
    },
    [onAfterServerSync, onAttachmentsChange, persist, persistLessonId]
  );

  const enqueue = (files: File[]) => {
    if (!files.length) return;
    const jobs = files.map((file) => ({ id: crypto.randomUUID(), name: file.name || 'file', file }));
    setPending((prev) => [...prev, ...jobs]);
    uploadChainRef.current = uploadChainRef.current
      .then(() => processPending(jobs))
      .catch((err) => console.error('[LessonAttachmentsField]', err));
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;
    enqueue(Array.from(files));
  };

  const removeAt = (index: number) => {
    const next = attachments.filter((_, i) => i !== index);
    attachmentsRef.current = next;
    onAttachmentsChange(next);
    if (!persistLessonId) return;
    void persist(next)
      .then(() => onAfterServerSync?.())
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not save files on the lesson.'));
  };

  const busy = pending.length > 0 || disabled;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-sm text-gray-700">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        <div className="min-w-0">
          <strong>Attachments (files)</strong>
          <p className="mt-0.5 text-xs text-gray-500">
            Upload PDFs, docs, slides, zip, etc. Learners can download them from the lesson.
          </p>
        </div>
      </div>

      <input ref={inputRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={onChange} />

      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3',
          busy && 'opacity-60'
        )}
      >
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Upload className="h-4 w-4 text-gray-400" aria-hidden />
          <span>{busy ? 'Uploading…' : 'Add lesson files'}</span>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          Choose files
        </Button>
      </div>

      {(attachments.length > 0 || pending.length > 0) && (
        <ul className="space-y-2">
          {attachments.map((url, i) => (
            <li key={`${url}-${i}`} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
              <a
                className="min-w-0 flex-1 truncate text-sm text-blue-700 hover:underline"
                href={resolveMediaUrl(url)}
                target="_blank"
                rel="noreferrer"
                title={url}
              >
                {displayNameFromUrl(url)}
              </a>
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => removeAt(i)} aria-label="Remove file">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </li>
          ))}
          {pending.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50/40 px-3 py-2 text-sm text-gray-700">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-xs text-gray-500">Uploading…</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


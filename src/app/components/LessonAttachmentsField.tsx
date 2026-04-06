import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { FileArchive, FileImage, FileSpreadsheet, FileText, FileType2, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadLessonFile, updateLesson } from '../utils/courseService';
import { resolveMediaUrl } from '../utils/api';
import { Button } from './ui/button';
import { cn } from './ui/utils';

const ACCEPT_FILES =
  'image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.rar,.7z,.md,.rtf';

type PendingFile = {
  id: string;
  name: string;
  file: File;
  previewUrl: string | null;
};

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

function extFromName(name: string): string {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/i);
  return match ? match[1] : '';
}

function inferKind(name: string, mime?: string): 'image' | 'pdf' | 'doc' | 'ppt' | 'xls' | 'archive' | 'other' {
  const ext = extFromName(name);
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif'].includes(ext)) {
    return 'image';
  }
  if (m.includes('pdf') || ext === 'pdf') return 'pdf';
  if (m.includes('word') || ['doc', 'docx', 'rtf'].includes(ext)) return 'doc';
  if (m.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (m.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'xls';
  if (m.includes('zip') || ['zip', 'rar', '7z'].includes(ext)) return 'archive';
  return 'other';
}

function FileKindBadge({ kind }: { kind: ReturnType<typeof inferKind> }) {
  if (kind === 'pdf') return <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">PDF</span>;
  if (kind === 'doc') return <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">DOC</span>;
  if (kind === 'ppt') return <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">PPT</span>;
  if (kind === 'xls') return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">XLS</span>;
  if (kind === 'archive') return <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">ZIP</span>;
  return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">FILE</span>;
}

function FileKindIcon({ kind }: { kind: ReturnType<typeof inferKind> }) {
  if (kind === 'image') return <FileImage className="h-5 w-5 text-indigo-600" aria-hidden />;
  if (kind === 'pdf') return <FileType2 className="h-5 w-5 text-red-600" aria-hidden />;
  if (kind === 'xls') return <FileSpreadsheet className="h-5 w-5 text-emerald-600" aria-hidden />;
  if (kind === 'archive') return <FileArchive className="h-5 w-5 text-violet-600" aria-hidden />;
  return <FileText className="h-5 w-5 text-slate-600" aria-hidden />;
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

  useEffect(() => {
    return () => {
      for (const p of pendingCleanupRef.current) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, []);

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
          if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
          setPending((prev) => prev.filter((p) => p.id !== job.id));

          const next = [...attachmentsRef.current, url];
          attachmentsRef.current = next;
          onAttachmentsChange(next);
          if (persistLessonId) await persist(next);
          ok += 1;
        } catch (e) {
          if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
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
    const jobs = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name || 'file',
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
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
            Local previews appear immediately. Images show thumbnails; PDF/DOC/PPT/XLS show file tiles.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_FILES}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onChange}
      />

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
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {attachments.map((url, i) => {
            const name = displayNameFromUrl(url);
            const kind = inferKind(name);
            return (
              <li key={`${url}-${i}`} className="group relative overflow-hidden rounded-md border border-gray-200 bg-white">
                {kind === 'image' ? (
                  <a href={resolveMediaUrl(url)} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={resolveMediaUrl(url)}
                      alt=""
                      className="h-28 w-full bg-gray-100 object-cover transition group-hover:opacity-95"
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                ) : (
                  <a href={resolveMediaUrl(url)} target="_blank" rel="noreferrer" className="flex h-28 items-center gap-3 px-3 py-2">
                    <FileKindIcon kind={kind} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{name}</p>
                      <div className="mt-1 inline-flex">
                        <FileKindBadge kind={kind} />
                      </div>
                    </div>
                  </a>
                )}
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-1.5 text-white opacity-90 shadow-md transition hover:opacity-100 disabled:opacity-50"
                  onClick={() => removeAt(i)}
                  disabled={busy}
                  aria-label="Remove file"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <a
                  className="absolute bottom-1.5 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/70"
                  href={resolveMediaUrl(url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview
                </a>
              </li>
            );
          })}
          {pending.map((p) => {
            const kind = inferKind(p.name, p.file.type);
            return (
              <li key={p.id} className="relative overflow-hidden rounded-md border border-blue-200 bg-blue-50/30">
                {kind === 'image' && p.previewUrl ? (
                  <img src={p.previewUrl} alt="" className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 items-center gap-3 px-3 py-2">
                    <FileKindIcon kind={kind} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">{p.name}</p>
                      <div className="mt-1 inline-flex">
                        <FileKindBadge kind={kind} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-white">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-200" aria-hidden />
                  <span className="text-xs font-medium">Uploading…</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


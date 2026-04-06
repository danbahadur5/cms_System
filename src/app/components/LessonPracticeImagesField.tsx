import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, DragEvent, SetStateAction } from 'react';
import {
  Upload,
  ImageIcon,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  FileText,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileType2,
  Presentation,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadLessonImage, uploadLessonFile, updateLesson } from '../utils/courseService';
import { resolveMediaUrl } from '../utils/api';
import { Button } from './ui/button';
import { cn } from './ui/utils';

const ACCEPT = 'image/*,.heic,.heif,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.rar,.7z,.md,.rtf';

function looksLikeImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const n = (file.name || '').toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/i.test(n);
}

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
  if (kind === 'doc') return <FileText className="h-5 w-5 text-blue-600" aria-hidden />;
  if (kind === 'ppt') return <Presentation className="h-5 w-5 text-orange-600" aria-hidden />;
  if (kind === 'xls') return <FileSpreadsheet className="h-5 w-5 text-emerald-600" aria-hidden />;
  if (kind === 'archive') return <FileArchive className="h-5 w-5 text-violet-600" aria-hidden />;
  return <FileText className="h-5 w-5 text-slate-600" aria-hidden />;
}

type PendingSlot = {
  id: string;
  file: File;
  kind: 'image' | 'file';
  previewUrl?: string;
};

export type LessonPracticeImagesFieldProps = {
  images: string[];
  onImagesChange: Dispatch<SetStateAction<string[]>>;
  attachments?: string[];
  onAttachmentsChange?: Dispatch<SetStateAction<string[]>>;
  persistLessonId?: string | null;
  onAfterServerSync?: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onOpenLightbox?: (urls: string[], index: number) => void;
  disabled?: boolean;
};

export function LessonPracticeImagesField({
  images,
  onImagesChange,
  attachments = [],
  onAttachmentsChange,
  persistLessonId,
  onAfterServerSync,
  onBusyChange,
  onOpenLightbox,
  disabled = false,
}: LessonPracticeImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const pendingSlotsCleanupRef = useRef<PendingSlot[]>([]);
  pendingSlotsCleanupRef.current = pendingSlots;
  const [dragActive, setDragActive] = useState(false);

  const imagesRef = useRef(images);
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const uploadChainRef = useRef(Promise.resolve());

  const persistMedia = useCallback(
    async (nextImages: string[], nextAttachments: string[]) => {
      if (!persistLessonId) return;
      await updateLesson(persistLessonId, {
        images: nextImages,
        attachments: nextAttachments,
      });
    },
    [persistLessonId]
  );

  const commitImageListChange = useCallback(
    async (nextImages: string[]) => {
      onImagesChange(nextImages);
      imagesRef.current = nextImages;
      if (!persistLessonId) return;
      try {
        await persistMedia(nextImages, attachmentsRef.current);
        await onAfterServerSync?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not save images on the lesson.';
        toast.error(msg);
      }
    },
    [onImagesChange, persistLessonId, persistMedia, onAfterServerSync]
  );

  useEffect(() => {
    onBusyChange?.(pendingSlots.length > 0);
  }, [pendingSlots.length, onBusyChange]);

  const processSlots = useCallback(
    async (slots: PendingSlot[]) => {
      if (!slots.length) return;
      const errors: string[] = [];
      let successImages = 0;
      let successFiles = 0;

      // Keep local copies of the current state during this batch process
      let currentImages = [...imagesRef.current];
      let currentAttachments = [...attachmentsRef.current];

      for (const slot of slots) {
        try {
          if (slot.kind === 'image') {
            const url = await uploadLessonImage(slot.file);
            currentImages = [...currentImages, url];
            onImagesChange(currentImages);
            imagesRef.current = currentImages; // Keep ref updated for subsequent slots in this loop
            
            if (persistLessonId) {
              await persistMedia(currentImages, currentAttachments);
            }
            successImages += 1;
          } else {
            if (!onAttachmentsChange) {
              throw new Error('File attachments are not configured in this form.');
            }
            const url = await uploadLessonFile(slot.file);
            currentAttachments = [...currentAttachments, url];
            onAttachmentsChange(currentAttachments);
            attachmentsRef.current = currentAttachments; // Keep ref updated
            
            if (persistLessonId) {
              await persistMedia(currentImages, currentAttachments);
            }
            successFiles += 1;
          }
        } catch (err) {
          const name = slot.file.name || 'file';
          errors.push(`${name}: ${err instanceof Error ? err.message : 'failed'}`);
        } finally {
          // Delay revocation of the preview URL to avoid flickering until the parent re-renders
          if (slot.previewUrl) {
            const preview = slot.previewUrl;
            setTimeout(() => URL.revokeObjectURL(preview), 1000);
          }
          setPendingSlots((prev) => prev.filter((s) => s.id !== slot.id));
        }
      }

      if (successImages > 0 || successFiles > 0) {
        const parts: string[] = [];
        if (successImages) parts.push(`${successImages} image${successImages !== 1 ? 's' : ''}`);
        if (successFiles) parts.push(`${successFiles} file${successFiles !== 1 ? 's' : ''}`);
        toast.success(`${parts.join(' and ')} uploaded${persistLessonId ? ' and saved' : ''}.`);
        if (persistLessonId) {
          await onAfterServerSync?.();
        }
      }
      if (errors.length) {
        const lines = errors.slice(0, 4).join(' · ');
        toast.error(errors.length > 4 ? `${lines} · …` : `Upload failed: ${lines}`);
      }
    },
    [onImagesChange, onAttachmentsChange, persistLessonId, persistMedia, onAfterServerSync]
  );

  const enqueueFiles = useCallback(
    (rawFiles: File[]) => {
      if (!rawFiles.length) return;
      const slots: PendingSlot[] = rawFiles.map((file) =>
        looksLikeImageFile(file)
          ? { id: crypto.randomUUID(), file, kind: 'image', previewUrl: URL.createObjectURL(file) }
          : { id: crypto.randomUUID(), file, kind: 'file' }
      );

      setPendingSlots((prev) => [...prev, ...slots]);
      uploadChainRef.current = uploadChainRef.current
        .then(() => processSlots(slots))
        .catch((err) => console.error('[LessonPracticeImagesField]', err));
    },
    [processSlots]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = Array.from(e.clipboardData?.items || []);
      const files: File[] = [];
      for (const item of items) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
      if (files.length > 0) {
        e.preventDefault();
        enqueueFiles(files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
      for (const s of pendingSlotsCleanupRef.current) {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      }
    };
  }, [disabled, enqueueFiles]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;
    enqueueFiles(Array.from(files));
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled || busy) return;
    const { files } = e.dataTransfer;
    if (files?.length) enqueueFiles(Array.from(files));
  };

  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void commitImageListChange(next);
  };

  const removeAt = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    void commitImageListChange(next);
  };

  const removeAttachmentAt = (index: number) => {
    if (!onAttachmentsChange) return;
    const next = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(next);
    if (!persistLessonId) return;
    void persistMedia(images, next)
      .then(() => onAfterServerSync?.())
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not save files on the lesson.'));
  };

  const uploading = pendingSlots.length > 0;
  const totalCount = images.length + pendingSlots.length;
  const busy = uploading || disabled;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-sm text-gray-700">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        <div>
          <strong>Lesson Media Uploads</strong>
          <p className="mt-0.5 font-normal text-xs text-gray-500">
            Images and practice files uploaded here will be stored in the backend and visible to students.
          </p>
        </div>
      </div>
      {!persistLessonId && (
        <p className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1.5 text-xs text-amber-950/90">
          New lesson: when uploads finish, click <strong>Create</strong> to attach them to this lesson.
        </p>
      )}
      {persistLessonId && (
        <p className="rounded-md border border-green-200/80 bg-green-50 px-2 py-1.5 text-xs text-green-950/90">
          Uploaded items save to this lesson as each upload completes.
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleInputChange}
      />
      <div
        role="region"
        aria-label="Media upload area"
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (!disabled && !busy) setDragActive(true);
        }}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-10 transition hover:border-blue-400 hover:bg-blue-50/40',
          dragActive ? 'border-blue-500 bg-blue-50/80' : 'border-gray-300 bg-gray-50/60',
          (disabled || busy) && 'pointer-events-none opacity-50'
        )}
      >
        <Upload className={cn('h-12 w-12 transition', dragActive ? 'text-blue-500' : 'text-gray-400')} aria-hidden />
        <div className="text-center">
          <span className="block text-base font-bold text-gray-900">Drop or Paste (Ctrl+V)</span>
          <span className="mt-1 block text-sm text-gray-500">
            Support images, PDFs, docs, spreadsheets, and more
          </span>
        </div>
      </div>
      {(images.length > 0 || attachments.length > 0 || pendingSlots.length > 0) && (
        <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-gray-50/30 p-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h5 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              Upload Preview
            </h5>
            {uploading && (
              <span className="flex items-center gap-2 text-xs font-semibold text-blue-600 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing {pendingSlots.length} items...
              </span>
            )}
          </div>

          {/* Images Grid */}
          {(images.length > 0 || pendingSlots.some(s => s.kind === 'image')) && (
            <div className="space-y-2">
              <h6 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Images ({images.length})</h6>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="list">
                {images.map((image, index) => (
                  <li key={`saved-${image}-${index}`} className="group relative">
                    <button
                      type="button"
                      className="block w-full overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-sm ring-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      onClick={() => onOpenLightbox?.(images, index)}
                      title="View full size"
                      disabled={busy}
                    >
                      <img
                        src={resolveMediaUrl(image)}
                        alt={`Preview ${index + 1}`}
                        className="h-28 w-full object-cover transition group-hover:scale-105 sm:h-32"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                    <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6 rounded-md bg-white/90 p-0 shadow-sm hover:bg-white"
                        disabled={busy || index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          move(index, -1);
                        }}
                        aria-label="Move earlier"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6 rounded-md bg-white/90 p-0 shadow-sm hover:bg-white"
                        disabled={busy || index === images.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          move(index, 1);
                        }}
                        aria-label="Move later"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAt(index);
                      }}
                      disabled={busy}
                      className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-1.5 text-white shadow-lg transition hover:bg-red-700 disabled:opacity-50"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                  </li>
                ))}
                {pendingSlots.filter(s => s.kind === 'image').map((slot) => (
                  <li key={slot.id} className="relative">
                    <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-blue-200 bg-blue-50 sm:h-32">
                      {slot.previewUrl ? (
                        <img src={slot.previewUrl} alt="" className="h-full w-full object-cover opacity-50" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-blue-200" />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/30 backdrop-blur-[1px]">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase">Uploading</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Attachments List */}
          {(attachments.length > 0 || pendingSlots.some(s => s.kind === 'file')) && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h6 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Files & Documents ({attachments.length})</h6>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="list">
                {attachments.map((url, index) => {
                  const name = displayNameFromUrl(url);
                  const kind = inferKind(name);
                  return (
                    <li key={`attach-${url}-${index}`} className="group relative flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                        <FileKindIcon kind={kind} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-gray-900" title={name}>{name}</p>
                        <div className="mt-0.5">
                          <FileKindBadge kind={kind} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={resolveMediaUrl(url)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 transition hover:bg-gray-200"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          onClick={() => removeAttachmentAt(index)}
                          disabled={busy}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          aria-label="Remove attachment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
                {pendingSlots.filter(s => s.kind === 'file').map((slot) => (
                  <li key={slot.id} className="relative flex items-center gap-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100/50">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-blue-700">{slot.file.name}</p>
                      <span className="text-[10px] font-bold text-blue-500 uppercase">Uploading...</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

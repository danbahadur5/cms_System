import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, DragEvent, SetStateAction } from 'react';
import { Upload, ImageIcon, Trash2, ChevronUp, ChevronDown, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { uploadLessonImage, uploadLessonFile, updateLesson } from '../utils/courseService';
import { resolveMediaUrl } from '../utils/api';
import { Button } from './ui/button';
import { cn } from './ui/utils';

const ACCEPT = 'image/*,.heic,.heif,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt';

function looksLikeImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const n = (file.name || '').toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/i.test(n);
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
          if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
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
    if (disabled) return;
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
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (!disabled) setDragActive(true);
        }}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 transition',
          dragActive ? 'border-blue-500 bg-blue-50/80' : 'border-gray-300 bg-gray-50/60',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <Upload className="h-8 w-8 text-gray-400" aria-hidden />
        <div className="text-center text-sm text-gray-700">
          <span className="block">Drop images/files here to upload to the server</span>
          <span className="text-xs text-gray-500">Instant preview will appear below</span>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          Choose media
        </Button>
      </div>
      {(images.length > 0 || pendingSlots.length > 0) && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" role="list">
          {images.map((image, index) => (
            <li key={`saved-${image}-${index}`} className="group relative">
              <button
                type="button"
                className="block w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-left ring-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => onOpenLightbox?.(images, index)}
                title="View full size"
                disabled={busy}
              >
                <img
                  src={resolveMediaUrl(image)}
                  alt={`Preview ${index + 1}`}
                  className="h-28 w-full object-cover transition group-hover:opacity-95 sm:h-32"
                  loading="lazy"
                  decoding="async"
                />
              </button>
              <div className="absolute left-1 top-1 flex flex-col gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 rounded-md bg-white/95 p-0 shadow-sm"
                  disabled={busy || index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    move(index, -1);
                  }}
                  aria-label="Move earlier in sequence"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 rounded-md bg-white/95 p-0 shadow-sm"
                  disabled={busy || index === images.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    move(index, 1);
                  }}
                  aria-label="Move later in sequence"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(index);
                }}
                disabled={busy}
                className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-1.5 text-white opacity-90 shadow-md transition hover:opacity-100 disabled:opacity-50"
                aria-label="Remove image"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                {index + 1}/{totalCount || 1}
              </span>
            </li>
          ))}
          {pendingSlots.map((slot, pIndex) => (
            <li key={slot.id} className="relative">
              <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-blue-200 bg-gray-100 sm:h-32">
                {slot.kind === 'image' && slot.previewUrl ? (
                  <img src={slot.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-700">
                    <FileText className="h-8 w-8" aria-hidden />
                    <span className="max-w-[90%] truncate px-2 text-xs font-medium">{slot.file.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                  <span className="px-2 text-center text-xs font-medium leading-tight">Uploading to Cloudinary...</span>
                </div>
              </div>
              <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                {images.length + pIndex + 1}/{totalCount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

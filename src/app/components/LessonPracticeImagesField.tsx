import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, DragEvent, SetStateAction } from 'react';
import { Upload, ImageIcon, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadLessonImage, updateLesson } from '../utils/courseService';
import { resolveMediaUrl } from '../utils/api';
import { Button } from './ui/button';
import { cn } from './ui/utils';

const ACCEPT = 'image/*,.heic,.heif';

function looksLikeImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const n = (file.name || '').toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|svg)$/i.test(n);
}

type PendingSlot = { id: string; previewUrl: string; file: File };

export type LessonPracticeImagesFieldProps = {
  images: string[];
  onImagesChange: Dispatch<SetStateAction<string[]>>;
  /** When set, uploads and list edits persist to this lesson immediately. */
  persistLessonId?: string | null;
  onAfterServerSync?: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  onOpenLightbox?: (urls: string[], index: number) => void;
  disabled?: boolean;
};

export function LessonPracticeImagesField({
  images,
  onImagesChange,
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

  /** Keeps persist order correct when multiple uploads are chained. */
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  /** Serialize upload jobs so state stays consistent with Cloudinary + DB. */
  const uploadChainRef = useRef(Promise.resolve());

  const persistImages = useCallback(
    async (next: string[]) => {
      if (!persistLessonId) return;
      await updateLesson(persistLessonId, { images: next });
    },
    [persistLessonId]
  );

  const commitListChange = useCallback(
    async (next: string[]) => {
      onImagesChange(next);
      if (!persistLessonId) return;
      try {
        await persistImages(next);
        await onAfterServerSync?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not save images on the lesson.';
        toast.error(msg);
      }
    },
    [onImagesChange, persistLessonId, persistImages, onAfterServerSync]
  );

  useEffect(() => {
    onBusyChange?.(pendingSlots.length > 0);
  }, [pendingSlots.length, onBusyChange]);

  const processSlots = useCallback(
    async (slots: PendingSlot[]) => {
      if (!slots.length) return;
      const errors: string[] = [];
      let successCount = 0;

      for (const slot of slots) {
        try {
          const url = await uploadLessonImage(slot.file);
          URL.revokeObjectURL(slot.previewUrl);
          setPendingSlots((prev) => prev.filter((s) => s.id !== slot.id));

          const next = [...imagesRef.current, url];
          imagesRef.current = next;
          onImagesChange(next);

          if (persistLessonId) {
            await persistImages(next);
          }
          successCount += 1;
        } catch (err) {
          URL.revokeObjectURL(slot.previewUrl);
          setPendingSlots((prev) => prev.filter((s) => s.id !== slot.id));
          const name = slot.file.name || 'image';
          errors.push(`${name}: ${err instanceof Error ? err.message : 'failed'}`);
        }
      }

      if (successCount > 0) {
        toast.success(
          `${successCount} image${successCount !== 1 ? 's' : ''} uploaded${persistLessonId ? ' and saved' : ''}.`
        );
        if (persistLessonId) {
          await onAfterServerSync?.();
        }
      }
      if (errors.length) {
        const lines = errors.slice(0, 4).join(' · ');
        toast.error(errors.length > 4 ? `${lines} · …` : `Upload failed: ${lines}`);
      }
    },
    [onImagesChange, persistImages, persistLessonId, onAfterServerSync]
  );

  const enqueueFiles = useCallback(
    (rawFiles: File[]) => {
      const fileArray = rawFiles.filter(looksLikeImageFile);
      if (!fileArray.length) {
        toast.warning('No supported image files in that selection.');
        return;
      }

      const slots: PendingSlot[] = fileArray.map((file) => ({
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
        file,
      }));

      setPendingSlots((prev) => [...prev, ...slots]);

      uploadChainRef.current = uploadChainRef.current
        .then(() => processSlots(slots))
        .catch((err) => console.error('[LessonPracticeImagesField]', err));
    },
    [processSlots]
  );

  useEffect(() => {
    return () => {
      for (const s of pendingSlotsCleanupRef.current) {
        URL.revokeObjectURL(s.previewUrl);
      }
    };
  }, []);

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
    imagesRef.current = next;
    void commitListChange(next);
  };

  const removeAt = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    imagesRef.current = next;
    void commitListChange(next);
  };

  const uploading = pendingSlots.length > 0;
  const totalCount = images.length + pendingSlots.length;
  const busy = uploading || disabled;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-sm text-gray-700">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        <div>
          <strong>Practice / project images</strong>
          <p className="mt-0.5 font-normal text-xs text-gray-500">
            Previews appear instantly; each file uploads to the server (Cloudinary when configured). Order matches what
            learners see.
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
          Saved images update on the lesson as each upload completes. Reorder applies to finished images only.
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
        aria-label="Image upload area"
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
          <span className="block">Drop image files here for instant preview</span>
          <span className="text-xs text-gray-500">then upload to the server</span>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          Choose images
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
              <div className="relative overflow-hidden rounded-lg border border-blue-200 bg-gray-100">
                <img
                  src={slot.previewUrl}
                  alt=""
                  className="h-28 w-full object-cover sm:h-32"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                  <span className="px-2 text-center text-xs font-medium leading-tight">Uploading to server…</span>
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

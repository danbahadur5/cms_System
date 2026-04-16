import { useState, useMemo, memo } from 'react';
import { Image as ImageIcon, Maximize2 } from 'lucide-react';
import { ImageLightboxDialog } from './ImageLightboxDialog';
import type { Lesson } from '../types/course';
import { resolveMediaUrl } from '../utils/api';

type Props = {
  lessonTitle: string;
  lessonType: Lesson['type'];
  images: string[];
};

export const LessonVisualModules = memo(function LessonVisualModules({ 
  lessonTitle, 
  lessonType, 
  images 
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const moduleLabel = useMemo(() =>
    lessonType === 'practice'
      ? 'Practice module'
      : lessonType === 'project'
        ? 'Project module'
        : 'Reference',
    [lessonType]
  );

  const shellClass = useMemo(() =>
    lessonType === 'practice'
      ? 'border-amber-200/90 bg-amber-50/50'
      : lessonType === 'project'
        ? 'border-emerald-200/90 bg-emerald-50/50'
        : 'border-slate-200/90 bg-slate-50/80',
    [lessonType]
  );

  const headingClass = useMemo(() =>
    lessonType === 'practice'
      ? 'text-amber-950'
      : lessonType === 'project'
        ? 'text-emerald-950'
        : 'text-slate-800',
    [lessonType]
  );

  if (!images.length) return null;

  return (
    <>
      <div className={`mt-5 rounded-xl border p-4 ${shellClass}`}>
        <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${headingClass}`}>
          <ImageIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span>Visual modules</span>
          <span className="font-normal opacity-70">— click a tile to view full size</span>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((src, i) => (
            <li key={`${src}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  setStartIndex(i);
                  setLightboxOpen(true);
                }}
                className="group w-full overflow-hidden rounded-lg border border-gray-200/90 bg-white text-left shadow-sm outline-none ring-offset-2 transition-all duration-300 hover:border-blue-400 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98]"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                  <img
                    src={resolveMediaUrl(src)}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    loading="lazy"
                    decoding="async"
                  />
                  <span
                    className="absolute right-2 top-2 flex rounded-full bg-black/60 p-1.5 text-white opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <span className="text-xs font-medium text-gray-800">
                    {moduleLabel} {i + 1}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-gray-400">
                    {i + 1}/{images.length}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <ImageLightboxDialog
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={images}
        initialIndex={startIndex}
        title={lessonTitle}
      />
    </>
  );
});

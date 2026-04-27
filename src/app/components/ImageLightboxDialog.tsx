import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from './ui/utils';
import { resolveMediaUrl } from '../utils/api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  initialIndex: number;
  title?: string;
};

export function ImageLightboxDialog({
  open,
  onOpenChange,
  images,
  initialIndex,
  title = 'Image preview',
}: Props) {
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize index when dialog opens
  useEffect(() => {
    if (open && images.length > 0) {
      const safe = Math.max(0, Math.min(initialIndex, images.length - 1));
      setIndex(safe);
      setIsLoading(true);
    }
  }, [open, initialIndex, images.length]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (images.length <= 1) return;
      // Don't setIsLoading(true) here because it causes a flickering if the image is already cached
      // Instead, we let the image transition smoothly when the src changes.
      setIndex((i) => {
        const n = i + dir;
        if (n < 0) return images.length - 1;
        if (n >= images.length) return 0;
        return n;
      });
    },
    [images.length]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  // Preload adjacent images for smoothness
  useEffect(() => {
    if (!open || images.length <= 1) return;
    
    const nextIdx = (index + 1) % images.length;
    const prevIdx = (index - 1 + images.length) % images.length;
    
    [images[nextIdx], images[prevIdx]].forEach(src => {
      if (src) {
        const img = new Image();
        img.src = resolveMediaUrl(src);
      }
    });
  }, [open, index, images]);

  if (!images.length) return null;
  const src = resolveMediaUrl(images[index]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[92vh] max-w-[min(68rem,calc(100%-2rem))] gap-0 overflow-hidden border-0 p-0 sm:max-w-5xl bg-zinc-950 ring-0 focus:outline-none content-protected'
        )}
        onContextMenu={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {title} — {index + 1} of {images.length}
          </DialogTitle>
        </DialogHeader>

        <div className="relative flex min-h-[300px] items-center justify-center bg-zinc-950">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin opacity-50" />
            </div>
          )}
          
          <img
            key={src}
            src={src}
            alt={`${title}, image ${index + 1} of ${images.length}`}
            className={cn(
              "max-h-[min(84vh,880px)] w-full object-contain transition-all duration-300 protected-allow-view",
              isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
            )}
            onLoad={() => setIsLoading(false)}
          />

          {images.length > 1 && (
            <>
              {/* Left navigation area */}
              <button
                type="button"
                className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-start pl-4 group cursor-pointer z-20 outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous image"
              >
                <div className="h-11 w-11 flex items-center justify-center rounded-full bg-black/20 text-white shadow-xl backdrop-blur-sm transition-all group-hover:bg-white/30 group-hover:scale-110 group-active:scale-95">
                  <ChevronLeft className="h-6 w-6" />
                </div>
              </button>

              {/* Right navigation area */}
              <button
                type="button"
                className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-end pr-4 group cursor-pointer z-20 outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next image"
              >
                <div className="h-11 w-11 flex items-center justify-center rounded-full bg-black/20 text-white shadow-xl backdrop-blur-sm transition-all group-hover:bg-white/30 group-hover:scale-110 group-active:scale-95">
                  <ChevronRight className="h-6 w-6" />
                </div>
              </button>
            </>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md z-30 pointer-events-none">
            {index + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

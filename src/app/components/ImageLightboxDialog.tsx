import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    if (!open || images.length === 0) return;
    const safe = Math.max(0, Math.min(initialIndex, images.length - 1));
    setIndex(safe);
  }, [open, initialIndex, images.length]);

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const n = i + dir;
        if (n < 0) return images.length - 1;
        if (n >= images.length) return 0;
        return n;
      });
    },
    [images.length]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (!images.length) return null;
  const src = resolveMediaUrl(images[index]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[92vh] max-w-[min(56rem,calc(100%-2rem))] gap-0 overflow-hidden border-0 p-0 sm:max-w-4xl'
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {title} — {index + 1} of {images.length}
          </DialogTitle>
        </DialogHeader>
        <div className="relative bg-zinc-950">
          <img
            src={src}
            alt={`${title}, image ${index + 1} of ${images.length}`}
            className="max-h-[min(78vh,820px)] w-full object-contain"
          />
          {images.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white/95 shadow-md hover:bg-white"
                onClick={() => go(-1)}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-0 bg-white/95 shadow-md hover:bg-white"
                onClick={() => go(1)}
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-center text-sm font-medium text-white">
            {index + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

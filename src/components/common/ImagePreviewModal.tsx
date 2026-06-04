import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

export type PreviewImage = {
  src: string;
  title: string;
};

type ImagePreviewModalProps = {
  images: PreviewImage[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ImagePreviewModal({ images, index, open, onClose, onIndexChange }: ImagePreviewModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const canNavigate = images.length > 1;

  const safeIndex = useMemo(() => {
    if (images.length === 0) return 0;
    return Math.min(Math.max(index, 0), images.length - 1);
  }, [images.length, index]);
  const image = images[safeIndex];

  useEffect(() => {
    if (!open) return;
    setIsZoomed(false);
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && canNavigate) onIndexChange((safeIndex - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight' && canNavigate) onIndexChange((safeIndex + 1) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigate, images.length, onClose, onIndexChange, open, safeIndex]);

  if (!open || !image) return null;

  const goPrevious = () => onIndexChange((safeIndex - 1 + images.length) % images.length);
  const goNext = () => onIndexChange((safeIndex + 1) % images.length);

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/82 p-3 pb-[calc(12px+env(safe-area-inset-bottom))]" role="dialog" aria-modal="true">
      <button type="button" aria-label="关闭图片预览" className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative z-10 flex h-full max-h-[92dvh] w-full max-w-[900px] flex-col overflow-hidden rounded-[22px] bg-neutral-950 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white">
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{image.title}</div>
            {canNavigate && (
              <div className="mt-0.5 text-[11px] font-bold text-white/45">{safeIndex + 1} / {images.length}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsZoomed(prev => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/18"
              aria-label={isZoomed ? '恢复原大小' : '放大图片'}
            >
              {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/18"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="app-scrollbar-hidden relative min-h-0 flex-1 overflow-auto bg-black p-2">
          {canNavigate && (
            <>
              <button
                type="button"
                onClick={goPrevious}
                className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/22"
                aria-label="上一张"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/22"
                aria-label="下一张"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            type="button"
            onDoubleClick={() => setIsZoomed(prev => !prev)}
            onClick={(event) => event.stopPropagation()}
            className={`mx-auto flex h-full min-h-[58dvh] items-center justify-center ${isZoomed ? 'w-max min-w-full cursor-zoom-out' : 'w-full cursor-zoom-in'}`}
            title="双击放大/恢复"
          >
            <img
              src={image.src}
              alt={image.title}
              className={isZoomed ? 'max-w-none object-contain' : 'max-h-full max-w-full object-contain'}
              style={isZoomed ? { width: '150%', maxHeight: 'none' } : undefined}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { recordUiFailure } from '../../services/diagnostics/ui-failure.service';

const FALLBACK_IMAGE = '/image-placeholder.svg';

const withRetryToken = (src: string) => {
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}retry=1`;
};

export function ResilientImage({ src = '', alt = '', className = '', onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
  }, [src]);

  const resolvedSrc = attempt === 0 ? src : attempt === 1 ? withRetryToken(src) : FALLBACK_IMAGE;

  return (
    <span className="relative block h-full w-full overflow-hidden">
      {!loaded && <span className="absolute inset-0 animate-pulse bg-slate-100" aria-hidden="true" />}
      <img
        {...props}
        src={resolvedSrc}
        alt={alt}
        className={`${className} relative z-[1]`}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={() => {
          if (attempt < 2) {
            if (attempt === 1) recordUiFailure({ kind: 'image', page: window.location.pathname, resource: src, error: new Error('图片重试失败') });
            setAttempt(value => value + 1);
          }
        }}
      />
    </span>
  );
}

import type { ComponentProps } from 'react';
import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLayoutMode } from '../layout/LayoutModeProvider';

type AdaptiveDetailContentProps = ComponentProps<typeof DialogContent>;

export function AdaptiveDetailContent({ className, ...props }: AdaptiveDetailContentProps) {
  const { isPhoneLayout } = useLayoutMode();
  return (
    <DialogContent
      data-surface={isPhoneLayout ? 'bottom-sheet' : 'centered-dialog'}
      className={cn(
        'flex flex-col overflow-hidden border-border bg-white p-0 shadow-[0_20px_60px_rgba(15,23,42,0.2)] duration-200',
        isPhoneLayout
          ? 'bottom-0 left-1/2 top-auto h-[92dvh] max-h-[92dvh] w-full max-w-[430px] -translate-x-1/2 translate-y-0 rounded-b-none rounded-t-[28px]'
          : 'bottom-auto left-1/2 right-auto top-1/2 h-auto max-h-[88dvh] w-[min(900px,calc(100vw-64px))] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-[28px]',
        className,
      )}
      {...props}
    />
  );
}

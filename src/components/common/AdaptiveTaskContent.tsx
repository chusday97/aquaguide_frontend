import type { ComponentProps } from 'react';
import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLayoutMode } from '../layout/LayoutModeProvider';

type AdaptiveTaskContentProps = ComponentProps<typeof DialogContent>;

export function AdaptiveTaskContent({ className, ...props }: AdaptiveTaskContentProps) {
  const { isPhoneLayout } = useLayoutMode();
  return (
    <DialogContent
      data-surface="task-flow"
      className={cn(
        'flex flex-col overflow-hidden border-border bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.2)] duration-200',
        isPhoneLayout
          ? 'bottom-0 left-0 right-auto top-0 h-[100dvh] max-h-[100dvh] w-full max-w-[430px] translate-x-0 translate-y-0 rounded-none'
          : 'max-h-[88dvh] w-[min(900px,calc(100vw-64px))] max-w-[900px] rounded-[28px]',
        className,
      )}
      {...props}
    />
  );
}
